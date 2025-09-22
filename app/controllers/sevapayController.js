import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';



export const sevapayPayment = async (req, res) => {
    try {
        const { amount, beneficiary, gateway, websiteUrl, transactionId } = await req.json();

        const userId = req.user?.id;

        

        const existingTransaction = await prisma.transactions.findFirst({
            where: {
                transactionId: transactionId,
            },
        });

        if (existingTransaction) {
            return NextResponse.json({ message: 'Transaction ID already exists' }, { status: 400 });
        }

        const unique_id = Date.now().toString() + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');

        const payload = {
            beneficiary: {
                name: beneficiary.accountHolderName,
                account_no: beneficiary.accountNumber,
                bank_ifsc_code: beneficiary.ifscCode
            },
            amount: amount,
            type: 'IMPS',
            unique_id: unique_id
        };

        let token;
        if (gateway === 'sevapay_weshubh') {
             // Get userId from req.user
        // Assuming req.user is populated by middleware and contains dmtPermissions
            if (!req.user || !req.user.impsPermissions?.enabled || !req.user.impsPermissions?.sevapay_weshubh) {
                console.warn(`User ${userId || 'Unknown'} does not have DMT permission.`);
                return NextResponse.json({ message: 'You do not have permission to perform DMT transactions.' }, { status: 403 });
            }
            token = process.env.SEVAPAY_API_TOKEN;
        } else if (gateway === 'sevapay_kelta') {
            if (!req.user || !req.user.impsPermissions?.enabled || !req.user.impsPermissions?.sevapay_kelta) {
                console.warn(`User ${userId || 'Unknown'} does not have DMT permission.`);
                return NextResponse.json({ message: 'You do not have permission to perform DMT transactions.' }, { status: 403 });
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
            await prisma.$transaction(async (tx) => {
                await tx.user.update({
                    where: { id: userId },
                    data: { balance: { decrement: amount } },
                });

                await tx.transactions.create({
                    data: {
                        amount: amount,
                        senderAccount: beneficiary.accountNumber,
                        beneficiary: {
                            connect: {
                                id: beneficiary.id
                            }
                        },
                        transactionType: 'IMPS',
                        transactionStatus: data.data.status === 'SUCCESS' ? 'COMPLETED' : data.data.status === 'PENDING' ? 'PENDING' : 'FAILED',
                        referenceNo: unique_id,
                        sender: {
                            connect: {
                                id: beneficiary.userId
                            }
                        },
                        chargesAmount: data.data.api_user_charges,
                        websiteUrl: websiteUrl,
                        transactionId: transactionId,
                        transaction_no: data.data.transaction_no,
                        utr: data.data.transaction_no, 
                        gateway: gateway,
                    }
                });
            });

            return NextResponse.json({ ...data, transaction_no: data.transaction_no || transactionId }, { status: 200 });
        } else {
            if (data.original && data.original.msg) {
                return NextResponse.json({ message: data.original.msg }, { status: data.original.code || 500 });
            }
            return NextResponse.json(data, { status: response.status });
        }
    } catch (error) {
        console.error("Error in sevapayPayment:", error);
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
                return data.data.balance;
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