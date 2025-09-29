import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

const P2I_API_URL = process.env.P2I_API_URL || 'http://127.0.0.1:8000';
const P2I_AUTH_TOKEN = process.env.P2I_AUTH_TOKEN;

export const p2iUpiPayout = async (req) => {
    console.log("P2I UPI Payout request received");
    try {
        const body = await req.json();
        const userId = req.user?.id;
        const { vpa, amount: rawAmount, name, websiteUrl } = body;
        console.log("Request body:", body);

        const [user, userCharges] = await Promise.all([
            prisma.user.findUnique({ where: { id: userId }, select: { upiPermissions: true, balance: true, isDisabled: true } }),
            prisma.userTransactionCharge.findMany({ where: { userId: userId, type: 'UPI' } })
        ]);

        if (!user) {
            console.error(`CRITICAL: Authenticated UserID: ${userId} not found.`);
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        if (user.isDisabled) {
            return NextResponse.json({ message: 'You are not allowed to use this service right now.' }, { status: 403 });
        }

        const lastTransaction = await prisma.transactions.findFirst({
            where: { senderId: userId },
            orderBy: { createdAt: 'desc' },
        });

        if (lastTransaction) {
            const now = new Date();
            const lastTransactionTime = new Date(lastTransaction.createdAt);
            const timeDifference = (now.getTime() - lastTransactionTime.getTime()) / 1000;

            if (timeDifference < 10) {
                return NextResponse.json({ message: 'Please try again after 1 minute.' }, { status: 429 });
            }
        }

        const existingWebsiteUrlTransaction = await prisma.transactions.findFirst({
            where: {
                websiteUrl: websiteUrl,
            },
        });

        if (existingWebsiteUrlTransaction) {
            return NextResponse.json({ message: 'A transaction with this website URL already exists.' }, { status: 400 });
        }

        if (!user.upiPermissions?.enabled || !user.upiPermissions?.p2i) {
            console.warn(`[${req.headers.get('x-request-id')}] User ${userId} does not have UPI p2i permission.`);
            return NextResponse.json({ message: 'You do not have permission to perform UPI p2i transactions.' }, { status: 403 });
        }

        if (!vpa || !rawAmount || !name) {
            console.error("Missing required fields: vpa, amount, name");
            return NextResponse.json({ message: 'Missing required fields: vpa, amount, name' }, { status: 400 });
        }

        const amount = new Decimal(rawAmount);

        let chargeRule;
        let isUserCharge = false;
        if (userCharges.length > 0) {
            chargeRule = userCharges.find(charge => new Decimal(charge.minAmount).lessThanOrEqualTo(amount) && new Decimal(charge.maxAmount).greaterThanOrEqualTo(amount));
            if (chargeRule) isUserCharge = true;
        }
        if (!chargeRule) {
            chargeRule = await prisma.transactionCharge.findFirst({
                where: {
                    type: 'UPI',
                    minAmount: { lte: amount },
                    maxAmount: { gte: amount },
                },
            });
        }

        const chargePercentage = chargeRule ? new Decimal(chargeRule.charge) : new Decimal(0);
        const transactionCharge = isUserCharge ? amount.mul(chargePercentage).div(100) : chargePercentage;
        const totalAmount = amount.add(transactionCharge);

        const token = P2I_AUTH_TOKEN;

        if (!token) {
            console.error("P2I API authentication token not configured");
            return NextResponse.json({ message: 'P2I API authentication token not configured' }, { status: 500 });
        }

        let isUnique = false;
        let transactionId;

        while (!isUnique) {
            const randomDigits = Math.floor(1000000000 + Math.random() * 9000000000).toString();
            transactionId = `WEPAYX${randomDigits}`;

            const existingTransaction = await prisma.transactions.findFirst({
                where: {
                    transactionId: transactionId,
                },
            });

            if (!existingTransaction) {
                isUnique = true;
            }
        }

        const payload = {
            unique_id: transactionId,
            vpa: vpa,
            amount: amount.toNumber(),
            name: name
        };

        const response = await fetch(`${P2I_API_URL}/apiclient/upi/upi-transaction`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'web_code': 'P2I',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            console.log("P2I UPI Payout successful");

            let beneficiaryRecord = await prisma.upiBeneficiary.findFirst({
                where: {
                    upiId: vpa,
                    userId: userId,
                }
            });

            if (!beneficiaryRecord) {
                console.log("Beneficiary not found for vpa, creating new one:", vpa);
                beneficiaryRecord = await prisma.upiBeneficiary.create({
                    data: {
                        upiId: vpa,
                        accountHolderName: name,
                        userId: userId,
                        isVerified: true,
                    }
                });
            }

            const newStatus = data.data.status === 'SUCCESS' ? 'COMPLETED' : 'PENDING';

            await prisma.$transaction(async (tx) => {
                const currentUser = await tx.user.findUnique({ where: { id: userId } });
                if (!currentUser || new Decimal(currentUser.balance).lessThan(totalAmount)) {
                    throw new Error('Insufficient balance');
                }

                const previousBalance = new Decimal(currentUser.balance);
                const closingBalance = previousBalance.minus(totalAmount);

                await tx.user.update({
                    where: { id: userId },
                    data: { balance: closingBalance },
                });

                const transactionRecord = await tx.transactions.create({
                    data: {
                        amount: amount,
                        senderAccount: 'UPI',
                        upiBeneficiaryId: beneficiaryRecord.id,
                        transactionType: 'UPI',
                        transactionStatus: newStatus,
                        referenceNo: uuidv4(),
                        senderId: userId,
                        transactionId: transactionId,
                        websiteUrl: websiteUrl,
                        utr: transactionId,
                        chargesAmount: transactionCharge,
                        previousBalance: previousBalance,
                        closingBalance: closingBalance,
                    }
                });

                await tx.userCharge.create({
                    data: {
                        amount: transactionCharge,
                        description: 'UPI Transaction Charge',
                        transactionId: transactionRecord.id,
                        userId: userId,
                        type: 'DEDUCTED'
                    }
                });
            });

            return NextResponse.json(data, { status: 200 });
        } else {
            console.error("P2I UPI Payout API error:", data);
            return NextResponse.json(data, { status: response.status });
        }

    } catch (error) {
        console.error("Error in p2iUpiPayout:", error.message);
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
};
