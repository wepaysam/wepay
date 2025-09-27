import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';
import { Decimal } from '@prisma/client/runtime/library'; // Import Decimal for calculations



export const sevapayPayment = async (req, res) => {
    try {
        const { amount, beneficiary, gateway, websiteUrl } = await req.json();

        const userId = req.user?.id;
        const unique_id = Date.now().toString() + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');

        let isUnique = false;
        let transactionId;

        while (!isUnique) {
            const randomDigits = Math.floor(1000000000 + Math.random() * 9000000000).toString(); // 10 random digits
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

        const user = await prisma.user.findUnique({ where: { id: userId }, select: { impsPermissions: true, isDisabled: true, balance: true, phoneNumber: true } });

        if (!user) {
            console.warn(`User ${userId || 'Unknown'} not found.`);
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        if (user.isDisabled) {
            return NextResponse.json({ message: 'You are not allowed to use this service right now.' }, { status: 403 });
        }

        // New security check: Check last transaction time
        const lastTransaction = await prisma.transactions.findFirst({
            where: { senderId: userId },
            orderBy: { createdAt: 'desc' },
        });

        if (lastTransaction) {
            const now = new Date();
            const lastTransactionTime = new Date(lastTransaction.createdAt);
            const timeDifference = (now.getTime() - lastTransactionTime.getTime()) / 1000; // in seconds

            if (timeDifference < 10) {
                return NextResponse.json({ message: 'Please try again after 1 minute.' }, { status: 429 }); // 429 Too Many Requests
            }
        }

        // Check for existing transaction with the same websiteUrl
        const existingWebsiteUrlTransaction = await prisma.transactions.findFirst({
            where: {
                websiteUrl: websiteUrl,
            },
        });

        if (existingWebsiteUrlTransaction) {
            return NextResponse.json({ message: 'A transaction with this website URL already exists.' }, { status: 400 });
        }

        

        const amountDecimal = new Decimal(amount);

        if (amountDecimal.isNaN() || amountDecimal.isNegative() || amountDecimal.isZero()) {
            return NextResponse.json({ message: 'A valid Amount is required.' }, { status: 400 });
        }

        const chargeRule = await prisma.transactionCharge.findFirst({
            where: {
              type: beneficiary.transactionType,
              minAmount: { lte: amountDecimal },
              maxAmount: { gte: amountDecimal },
            },
          });
      
        const transactionCharge = chargeRule ? new Decimal(chargeRule.charge) : new Decimal(0);
        const totalDebitAmount = amountDecimal.add(transactionCharge);

        // --- Step 2: Atomically Reserve Funds and Create Pending Transaction ---
        let transactionRecord;
        try {
            await prisma.$transaction(async (tx) => {
                const currentUser = await tx.user.findUnique({ where: { id: userId }, select: { balance: true } });
                if (!currentUser || currentUser.balance.lessThan(totalDebitAmount)) {
                    throw new Error('Insufficient balance');
                }

                await tx.user.update({
                    where: { id: userId },
                    data: { balance: { decrement: totalDebitAmount } },
                });

                transactionRecord = await tx.transactions.create({
                    data: {
                        sender: { connect: { id: userId } },
                        beneficiary: { connect: { id: beneficiary.id } },
                        amount: amountDecimal,
                        chargesAmount: transactionCharge,
                        transactionType: 'IMPS',
                        transactionStatus: 'PENDING', // Initially PENDING
                        senderAccount: user.phoneNumber, // Using phone number as sender account
                        websiteUrl: websiteUrl,
                        transactionId: transactionId,
                        gateway: gateway,
                        referenceNo: unique_id,
                    },
                });
            });
            console.log(`Funds reserved and pending Sevapay transaction ${transactionRecord.id} created.`);
        } catch (dbError) {
            console.error(`Failed to reserve funds or create pending Sevapay transaction:`, dbError);
            return NextResponse.json({ message: dbError.message || 'Failed to process payment due to a database error.' }, { status: 400 });
        }

        const payload = {
            beneficiary: {
                name: beneficiary.accountHolderName,
                account_no: beneficiary.accountNumber,
                bank_ifsc_code: beneficiary.ifscCode
            },
            amount: amount,
            type: 'IMPS',
            unique_id: transactionId
        };

        let token;
        if (gateway === 'sevapay_weshubh') {
             // Get userId from req.user
        // Assuming req.user is populated by middleware and contains dmtPermissions
            if (!user || !user.impsPermissions?.enabled || !user.impsPermissions?.sevapay_weshubh) {
                console.warn(`User ${userId || 'Unknown'} does not have IMPS sevapay_weshubh permission.`);
                return NextResponse.json({ message: 'You do not have permission to perform IMPS sevapay_weshubh transactions.' }, { status: 403 });
            }
            token = process.env.SEVAPAY_API_TOKEN;
        } else if (gateway === 'sevapay_kelta') {
            if (!user || !user.impsPermissions?.enabled || !user.impsPermissions?.sevapay_kelta) {
                console.warn(`User ${userId || 'Unknown'} does not have IMPS sevapay_kelta permission.`);
                return NextResponse.json({ message: 'You do not have permission to perform IMPS sevapay_kelta transactions.' }, { status: 403 });
            }
            token = process.env.KETLA_API_TOKEN;
        } else {
            // Default to SEVAPAY_API_TOKEN if gateway is not provided or invalid
            token = process.env.SEVAPAY_API_TOKEN;
        }


        const headers = {
            'Content-Type': 'application/json',
            'web_code': 'SEVAPAY_X',
            'Authorization': `Bearer ${token}`
        };



        const response = await fetch(`${process.env.SEVAPAY_API_URL}/apiclient/mini-i/transaction`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        const text = await response.text();
        const data = JSON.parse(text);
        console.log("Sevapay response:", data);

        if (response.ok && !data.original) {
            // SUCCESS PATH: Update pending transaction to COMPLETED/PENDING based on API result
            console.log(`Sevapay reported SUCCESS. Finalizing transaction.`);
            try {
                await prisma.transactions.update({
                    where: { id: transactionRecord.id },
                    data: {
                        transactionStatus: data.data.status === 'SUCCESS' ? 'COMPLETED' : data.data.status === 'PENDING' ? 'PENDING' : 'FAILED',
                        transaction_no: data.data.transaction_no,
                        utr: data.data.transaction_no, // Assuming UTR is transaction_no from Sevapay
                    },
                });
                console.log(`Sevapay Transaction ${transactionRecord.id} finalized successfully.`);
                return NextResponse.json({ ...data, transaction_no: data.data.transaction_no || transactionId }, { status: 200 });
            } catch (txError) {
                console.error(`CRITICAL: Failed to finalize Sevapay transaction ${transactionRecord.id} after successful payout! Manual intervention required.`, txError);
                return NextResponse.json({ message: 'Payout successful, but failed to update records. Please contact support.', payoutData: data }, { status: 500 });
            }
        } else {
            // FAILURE PATH: Revert funds and mark transaction as FAILED
            console.warn(`Sevapay payout failed. Reverting funds.`);
            try {
                await prisma.$transaction(async (tx) => {
                    await tx.user.update({
                        where: { id: userId },
                        data: { balance: { increment: totalDebitAmount } },
                    });
                    await tx.transactions.update({
                        where: { id: transactionRecord.id },
                        data: { transactionStatus: 'FAILED' },
                    });
                });
                console.log(`Funds reverted and Sevapay transaction ${transactionRecord.id} marked FAILED due to Sevapay failure.`);
            } catch (revertError) {
                console.error(`CRITICAL: Failed to revert funds after Sevapay failure! Manual intervention required for transaction ${transactionRecord.id}.`, revertError);
            }
            if (data.original && data.original.msg) {
                return NextResponse.json({ message: data.original.msg }, { status: data.original.code || 500 });
            }
            return NextResponse.json(data, { status: response.status });
        }
    } catch (error) {
        console.error("Error in sevapayPayment:", error);
        // If transactionRecord was created, attempt to revert funds
        if (transactionRecord) {
            try {
                await prisma.$transaction(async (tx) => {
                    await tx.user.update({
                        where: { id: userId },
                        data: { balance: { increment: totalDebitAmount } },
                    });
                    await tx.transactions.update({
                        where: { id: transactionRecord.id },
                        data: { transactionStatus: 'FAILED' },
                    });
                });
                console.log(`Funds reverted and transaction ${transactionRecord.id} marked FAILED due to global error.`);
            } catch (revertError) {
                console.error(`CRITICAL: Failed to revert funds after global error! Manual intervention required for transaction ${transactionRecord.id}.`, revertError);
            }
        }
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
};

export const sevapayStatus = async (req, res) => {
    const { unique_id, id, gateway } = await req.json();

    let token;
    if (gateway === 'sevapay_weshubh') {
        token = process.env.SEVAPAY_API_TOKEN;
    } else if (gateway === 'sevapay_kelta') {
        token = process.env.KETLA_API_TOKEN;
    } else {
        // Default to SEVAPAY_API_TOKEN if gateway is not provided or invalid
        token = process.env.SEVAPAY_API_TOKEN;
    }

    try {
        const response = await fetch(`${process.env.SEVAPAY_API_URL}/apiclient/mini-i/status-check`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'web_code': 'SEVAPAY_X',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                unique_id: unique_id
            })
        });

        const text = await response.text();
        const data = JSON.parse(text);

        if (response.ok) {
            const transaction = await prisma.transactions.findUnique({ where: { id } });

            if (!transaction) {
                return NextResponse.json({ message: 'Transaction not found' }, { status: 404 });
            }

            const newStatus = data.data.status === 'SUCCESS' ? 'COMPLETED' : data.data.status === 'PENDING' ? 'PENDING' : 'FAILED';

            await prisma.$transaction(async (tx) => {
                await tx.transactions.update({
                    where: { id: id },
                    data: {
                        transactionStatus: newStatus,
                        utr: data.data.third_party_no || data.data.transaction_no,
                    }
                });

                if (newStatus === 'FAILED' && transaction.transactionStatus !== 'FAILED') {
                    await tx.user.update({
                        where: { id: transaction.senderId },
                        data: { balance: { increment: transaction.amount } },
                    });
                }
            });

            return NextResponse.json(data, { status: 200 });
        } else {
            return NextResponse.json(data, { status: response.status });
        }
    } catch (error) {
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
};

export const getBalances = async () => {
    const tokens = {
        vishubh: process.env.SEVAPAY_API_TOKEN,
        kotal: process.env.KETLA_API_TOKEN,
    };

    const fetchBalance = async (token) => {
        try {
            const response = await fetch(`${process.env.SEVAPAY_API_URL}/apiclient/balance-check`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'web_code': 'SEVAPAY_X',
                    'Authorization': `Bearer ${token}`
                },
            });

            const data = await response.json();
            console.log("Balance response:", data);

            if (response.ok && data.code === 200) {
                return parseFloat(data.data.balance); // Parse to float
            } else {
                console.error(`Failed to fetch balance for token`, data);
                return 0;
            }
        } catch (error) {
            console.error(`Error fetching balance for token`, error);
            return 0;
        }
    };

    try {
        const [vishubhBalance, kotalBalance] = await Promise.all([
            fetchBalance(tokens.vishubh),
            fetchBalance(tokens.kotal),
        ]);

        return { vishubhBalance, kotalBalance };
    } catch (error) {
        console.error("Error fetching balances in parallel:", error);
        return { vishubhBalance: 0, kotalBalance: 0 };
    }
};