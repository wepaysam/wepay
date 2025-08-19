import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';



export const sevapayPayment = async (req, res) => {
    try {
        const { amount, beneficiary, gateway, websiteUrl, transactionId } = await req.json();

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
            token = process.env.SEVAPAY_API_TOKEN;
        } else if (gateway === 'sevapay_kelta') {
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
            await prisma.transactions.create({
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
            const transaction = await prisma.transactions.update({
                where: {
                    id: id
                },
                data: {
                    transactionStatus: data.data.status === 'SUCCESS' ? 'COMPLETED' : data.data.status === 'PENDING' ? 'PENDING' : 'FAILED',
                    utr: data.data.third_party_no || data.data.transaction_no,
                }
            });

            if (data.data.status === 'SUCCESS') {
                const balanceUpdate = transaction.gateway === 'sevapay_weshubh'
                    ? { vishubhBalance: data.data.balance }
                    : { kotalBalance: data.data.balance };

                await prisma.balance.upsert({
                    where: { id: "1" },
                    update: balanceUpdate,
                    create: {
                        id: "1",
                        vishubhBalance: transaction.gateway === 'sevapay_weshubh' ? data.data.balance : 0,
                        kotalBalance: transaction.gateway === 'sevapay_kelta' ? data.data.balance : 0,
                    }
                });
            }
            return NextResponse.json(data, { status: 200 });
        } else {
            return NextResponse.json(data, { status: response.status });
        }
    } catch (error) {
        console.error("Error in sevapayStatus:", error);
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
};