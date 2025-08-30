import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';
import crypto from 'crypto';

function generateHash(mid, parameters, hashingMethod = 'sha512', secretKey) {
  let hashData = mid;
  for (const key in parameters) {
    if (key !== 'hash') {
      hashData += '|' + parameters[key];
    }
  }
  hashData += '|' + secretKey;
  if (hashData.length > 0) {
    return crypto.createHash(hashingMethod).update(hashData).digest('hex').toLowerCase();
  }
  return null;
}



export const dmtPayment = async (req) => {
    try {
        const { name, accountNumber, ifsc, amount, remarks, paymentMode, paymentReferenceNo, beneficiary, gateway, websiteUrl, transactionId } = await req.json();

        const bankDetails = await prisma.BankInfo.findUnique({
            where: { ifsc },
        });

        if (!bankDetails) {
            return NextResponse.json({ message: 'Invalid IFSC code' }, { status: 400 });
        }
        // const userId =  req.user.id ; 

        const bankName = bankDetails.name;
        const bankBranch = bankDetails.location;

        // Placeholder for merchantId and secretKey - REPLACE WITH ACTUAL VALUES FROM AUTH CONTEXT
        const merchantId = process.env.KATLA_MERCHANT_ID ; 
        const secretKey = process.env.KATLA_SECRET_KEY;
        console.log("Received dmtPayment request:", { name, bankName, bankBranch, accountNumber, ifsc, amount, remarks, paymentMode, beneficiary, gateway, websiteUrl, transactionId });

        const existingTransaction = await prisma.transactions.findFirst({
            where: {
                transactionId: transactionId,
            },
        });

        if (existingTransaction) {
            return NextResponse.json({ message: 'Transaction ID already exists' }, { status: 400 });
        }

        const unique_id = Date.now().toString() + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');

        const parametersForHash = {
            name: beneficiary.accountHolderName,
            bankName,
            bankBranch,
            accountNumber: beneficiary.accountNumber,
            ifsc: beneficiary.ifscCode,
            amount,
            remarks,
            paymentMode,
            paymentReferenceNo: unique_id
        };

        const generatedHash = generateHash(merchantId, parametersForHash, 'sha512', secretKey);

        if (!generatedHash) {
            return NextResponse.json({ message: 'Failed to generate hash' }, { status: 500 });
        }

        const payload = {
            name,
            bankName,
            bankBranch,
            accountNumber,
            ifsc,
            amount,
            remarks,
            paymentMode,
            paymentReferenceNo: unique_id,
            hash: generatedHash
        };

        const headers = {
            'Content-Type': 'application/json',
            'merchantID': merchantId,
            'secretkey': secretKey // Note: Sending secretKey in headers is generally not recommended for client-side. This is based on your provided testhash.js.
        };

        const response = await fetch(`${process.env.KATLA_API_URL}/create-payout-transaction`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        const text = await response.text();
        const data = JSON.parse(text);
        console.log("Katla API response:", data);

        if (response.ok ) {
            await prisma.transactions.create({
                data: {
                    amount: parseFloat(amount),
                    senderAccount: accountNumber,
                    dmtBeneficiary: {
                        connect: {
                            id: beneficiary.id
                        }
                    },
                    transactionType: 'DMT',
                    transactionStatus: data.status === 'SUCCESS' ? 'COMPLETED' : data.status === 'PENDING' ? 'PENDING' : 'FAILED',
                    referenceNo: unique_id,
                    sender: {
                        connect: {
                            id: beneficiary.userId
                        }
                    },
                    chargesAmount: 0, // You need to determine chargesAmount
                    websiteUrl: websiteUrl,
                    transactionId: transactionId,
                    transaction_no: data.transaction_no || paymentReferenceNo,
                    utr: data.utr || data.transaction_no, 
                    gateway: gateway,
                }
            });
            return NextResponse.json({ ...data, transaction_no: data.transaction_no || transactionId }, { status: 200 });
        } else {
            return NextResponse.json(data, { status: response.status });
        }
    } catch (error) {
        console.error("Error in dmtPayment:", error);
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
};

export const dmtStatus = async (req, res) => {
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
        const response = await fetch(`https://api.ketlacollect.com/v1/pg/check-payout-transaction-status`, {
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

            // if (data.data.status === 'SUCCESS') {
            //     const balanceUpdate = transaction.gateway === 'sevapay_weshubh'
            //         ? { vishubhBalance: data.data.balance }
            //         : { kotalBalance: data.data.balance };

            //     await prisma.balance.upsert({
            //         where: { id: "1" },
            //         update: balanceUpdate,
            //         create: {
            //             id: "1",
            //             vishubhBalance: transaction.gateway === 'sevapay_weshubh' ? data.data.balance : 0,
            //             kotalBalance: transaction.gateway === 'sevapay_kelta' ? data.data.balance : 0,
            //         }
            //     });
            // }
            return NextResponse.json(data, { status: 200 });
        } else {
            return NextResponse.json(data, { status: response.status });
        }
    } catch (error) {
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
};

export const getBalances = async () => {
    const merchantId = process.env.KATLA_MERCHANT_ID; 
    const secretKey = process.env.KATLA_SECRET_KEY;

    const fetchBalance = async () => {
        try {
            const response = await fetch(`https://api.ketlacollect.com/v1/pg/balance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'merchantID': merchantId,
                    'secretkey': secretKey
                },
            });

            const data = await response.json();
            console.log("Balance response:", data);

            if (response.ok && data.code === 200) {
                return data;
            } else {
                console.error(`Failed to fetch balance`, data);
                return { data: { currentBalance: 0 } };
            }
        } catch (error) {
            console.error(`Error fetching balance`, error);
            return { data: { currentBalance: 0 } };
        }
    };

    try {
        const kotalBalance = await fetchBalance();
        return kotalBalance;
    } catch (error) {
        console.error("Error fetching balances in parallel:", error);
        return { data: { currentBalance: 0 } };
    }
};