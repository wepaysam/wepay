
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';

export const sevapayLogin = async () => {
    // Logic to login to Sevapay API
};

export const sevapayPayment = async (req, res) => {
    try {
        const { amount, beneficiary } = await req.json();
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

        console.log("Sevapay API request payload:", JSON.stringify(payload, null, 2));

        const headers = {
            'Content-Type': 'application/json',
            'web_code': 'SEVAPAY_X',
            'Authorization': `Bearer ${process.env.SEVAPAY_API_TOKEN}`
        };

        console.log("Sevapay API request headers:", headers);

        const response = await fetch(`${process.env.SEVAPAY_API_URL}/apiclient/mini-i/transaction`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        const text = await response.text();
        console.log("Sevapay API response:", text);
        const data = JSON.parse(text);

        if (response.ok) {
            await prisma.transactions.create({
                data: {
                    amount: amount,
                    beneficiaryId: beneficiary.id,
                    transactionType: 'IMPS',
                    transactionStatus: data.data.status === 'SUCCESS' ? 'COMPLETED' : data.data.status === 'PENDING' ? 'PENDING' : 'FAILED',
                    referenceNo: unique_id,
                    senderId: beneficiary.userId,
                    chargesAmount: data.data.api_user_charges,
                }
            });
            return NextResponse.json(data, { status: 200 });
        } else {
            return NextResponse.json(data, { status: response.status });
        }
    } catch (error) {
        console.error("Error in sevapayPayment:", error);
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
};

export const sevapayStatus = async (req, res) => {
    const { unique_id } = await req.json();

    try {
        const response = await fetch(`${process.env.SEVAPAY_API_URL}/apiclient/mini-i/status-check`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'web_code': 'SEVAPAY_X',
                'Authorization': `Bearer ${process.env.SEVAPAY_API_TOKEN}`
            },
            body: JSON.stringify({
                unique_id: unique_id
            })
        });

        const text = await response.text();
        console.log("Sevapay API response:", text);
        const data = JSON.parse(text);

        if (response.ok) {
            await prisma.transactions.update({
                where: {
                    referenceNo: unique_id
                },
                data: {
                    transactionStatus: data.data.status === 'SUCCESS' ? 'COMPLETED' : data.data.status === 'PENDING' ? 'PENDING' : 'FAILED'
                }
            });
            return NextResponse.json(data, { status: 200 });
        } else {
            return NextResponse.json(data, { status: response.status });
        }
    } catch (error) {
        console.error("Error in sevapayStatus:", error);
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
};
