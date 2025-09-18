import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';

const P2I_API_URL = process.env.P2I_API_URL || 'http://127.0.0.1:8000';
// const P2I_EMAIL = process.env.P2I_EMAIL;
// const P2I_PASSWORD = process.env.P2I_PASSWORD;
const P2I_AUTH_TOKEN = process.env.P2I_AUTH_TOKEN;


// let p2iAuthToken = null;
// let tokenExpiryTime = 0;

// const getP2IAuthToken = async () => {
//     if (p2iAuthToken && Date.now() < tokenExpiryTime) {
//         return p2iAuthToken;
//     }

//     try {
//         const response = await fetch(`${P2I_API_URL}/api/login`, {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'web_code': 'P2I'
//             },
//             body: JSON.stringify({
//                 email: P2I_EMAIL,
//                 password: P2I_PASSWORD
//             })
//         });

//         const data = await response.json();

//         if (response.ok && data.data && data.data.token) {
//             p2iAuthToken = data.data.token;
//             // Assuming token expires in 1 hour (3600 seconds) for simplicity, adjust if API provides expiry
//             tokenExpiryTime = Date.now() + (3600 * 1000);
//             return p2iAuthToken;
//         } else {
//             console.error("Failed to get P2I auth token:", data);
//             throw new Error("Failed to authenticate with P2I API");
//         }
//     } catch (error) {
//         console.error("Error fetching P2I auth token:", error);
//         throw new Error("Error connecting to P2I API for authentication");
//     }
// };

export const p2iUpiPayout = async (req) => {
    console.log("P2I UPI Payout request received");
    try {
        const body = await req.json();
        const { vpa, amount, name, websiteUrl, utr } = body;
        console.log("Request body:", body);

        if (!user.upiPermissions?.enabled || !user.upiPermissions?.p2i) {
                console.log("akash asmple",user.upiPermissions);
                console.warn(`[${requestId}] User ${userId} does not have UPI p2i permission.`);
                return NextResponse.json({ message: 'You do not have permission to perform UPI p2i transactions.' }, { status: 403 });
        }

        const existingTransaction = await prisma.transactions.findFirst({
            where: {
                transactionId: utr,
            },
        });

        if (existingTransaction) {
            return NextResponse.json({ message: 'Transaction ID already exists' }, { status: 400 });
        }        


        if (!vpa || !amount || !name) {
            console.error("Missing required fields: vpa, amount, name");
            return NextResponse.json({ message: 'Missing required fields: vpa, amount, name' }, { status: 400 });
        }

        // const token = await getP2IAuthToken();
        const token = P2I_AUTH_TOKEN;

        if (!token) {
            console.error("P2I API authentication token not configured");
            // return NextResponse.json({ message: 'P2I API authentication failed' }, { status: 500 });
            return NextResponse.json({ message: 'P2I API authentication token not configured' }, { status: 500 });

        }

        const unique_id = Date.now().toString() + Math.floor(Math.random() * 10000000).toString().padStart(7, '0'); // min 18 max 24

        const payload = {
            unique_id: unique_id,
            vpa: vpa,
            amount: amount,
            name: name 
        };
        console.log("Payload to be sent to P2I API:", payload);

        console.log("P2I API URL:", P2I_API_URL+"/apiclient/upi/upi-transaction");

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
        console.log("Response from P2I API:", data);


        if (response.ok) {
            console.log("P2I UPI Payout successful");

            const userId = req.user.id;
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
                        isVerified: true, // Assuming verification is done implicitly
                    }
                });
            }

            await prisma.transactions.create({
                data: {
                    amount: amount,
                    senderAccount: 'UPI', // Or some other identifier
                    upiBeneficiaryId: beneficiaryRecord.id,
                    transactionType: 'UPI',
                    transactionStatus: data.data.status === 'SUCCESS' ? 'COMPLETED' : data.data.status === 'PENDING' ? 'PENDING' : 'FAILED',
                    referenceNo: unique_id,
                    senderId: userId,
                    transactionId: utr,
                    websiteUrl: websiteUrl,
                    utr: utr,
                    chargesAmount: data.data.api_user_charges || 0,
                }
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
