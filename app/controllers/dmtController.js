import { NextResponse } from 'next/server';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../lib/prisma';
import crypto, { hash } from 'crypto';



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
        const { name, accountNumber, ifsc, amount: rawAmount, remarks, paymentMode, paymentReferenceNo, beneficiary, gateway, websiteUrl } = await req.json();

        const userId = req.user?.id; // Get userId from req.user
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
        // --- Step 1: Fetch User and Beneficiary ---
        const [user] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { dmtPermissions: true, isDisabled: true, balance: true, phoneNumber: true } })
        ]);

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

        // Assuming req.user is populated by middleware and contains dmtPermissions
        if (!user || !user.dmtPermissions?.enabled) {
            console.warn(`User ${userId || 'Unknown'} does not have DMT permission.`);
            return NextResponse.json({ message: 'You do not have permission to perform DMT transactions.' }, { status: 403 });
        }

        const amount = new Decimal(rawAmount);

        if (amount.isNaN() || amount.isNegative() || amount.isZero()) {
            return NextResponse.json({ message: 'A valid Amount is required.' }, { status: 400 });
        }

        const chargeRule = await prisma.transactionCharge.findFirst({
            where: {
              type: 'DMT',
              minAmount: { lte: amount },
              maxAmount: { gte: amount },
            },
          });
      
        const transactionCharge = chargeRule ? new Decimal(chargeRule.charge) : new Decimal(0);
        const totalDebitAmount = amount.add(transactionCharge);

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
                        dmtBeneficiary: { connect: { id: beneficiary.id } },
                        amount: amount,
                        chargesAmount: transactionCharge,
                        transactionType: 'DMT',
                        transactionStatus: 'PENDING', // Initially PENDING
                        senderAccount: user.phoneNumber, // Using phone number as sender account
                        websiteUrl: websiteUrl,
                        transactionId: transactionId,
                        gateway: 'DMT',
                        referenceNo: unique_id,
                    },
                });
            });
            console.log(`Funds reserved and pending DMT transaction ${transactionRecord.id} created.`);
        } catch (dbError) {
            console.error(`Failed to reserve funds or create pending DMT transaction:`, dbError);
            return NextResponse.json({ message: dbError.message || 'Failed to process payment due to a database error.' }, { status: 400 });
        }

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
        console.log("Received dmtPayment request:", { name, bankName, bankBranch, accountNumber, ifsc, amount, remarks, paymentMode, beneficiary, gateway, websiteUrl });

        

        const parametersForHash = {
            name: beneficiary.accountHolderName,
            bankName,
            bankBranch,
            accountNumber: beneficiary.accountNumber,
            ifsc: beneficiary.ifscCode,
            amount: amount.toNumber(),
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
            amount: amount.toNumber(),
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
            // SUCCESS PATH: Update pending transaction to COMPLETED/PENDING based on API result
            console.log(`Katla reported SUCCESS. Finalizing transaction.`);
            try {
                await prisma.transactions.update({
                    where: { id: transactionRecord.id },
                    data: {
                        transactionStatus: data.status === 'SUCCESS' ? 'COMPLETED' : 'PENDING',
                        transaction_no: data.transaction_no || paymentReferenceNo,
                        utr: data.clientRefNo,
                        dmthash: data.clientRefNo,
                    },
                });
                console.log(`DMT Transaction ${transactionRecord.id} finalized successfully.`);
                return NextResponse.json({ ...data, transaction_no: data.transaction_no || transactionId }, { status: 200 });
            } catch (txError) {
                console.error(`CRITICAL: Failed to finalize DMT transaction ${transactionRecord.id} after successful payout! Manual intervention required.`, txError);
                return NextResponse.json({ message: 'Payout successful, but failed to update records. Please contact support.', payoutData: data }, { status: 500 });
            }
        } else {
            // FAILURE PATH: Revert funds and mark transaction as FAILED
            console.warn(`Katla DMT payout failed. Reverting funds.`);
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
                console.log(`Funds reverted and DMT transaction ${transactionRecord.id} marked FAILED due to Katla failure.`);
            } catch (revertError) {
                console.error(`CRITICAL: Failed to revert funds after Katla failure! Manual intervention required for transaction ${transactionRecord.id}.`, revertError);
            }
            return NextResponse.json(data, { status: response.status });
        }
    } catch (error) {
        console.error("Error in dmtPayment:", error);
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
};

// export const dmtStatus = async (req, res) => {
//     const { unique_id, id } = await req.json();

//     const merchantId = process.env.KATLA_MERCHANT_ID; 
//     const secretKey = process.env.KATLA_SECRET_KEY;

//     const transaction = await prisma.transactions.findUnique({
//         where: {
//             id: id
//         }
//     });

//     if (!transaction) {
//         return NextResponse.json({ message: 'Transaction not found' }, { status: 404 });
//     }

//     if (transaction.transactionType !== 'DMT') {
//         return NextResponse.json({ message: 'Not a DMT transaction' }, { status: 400 });
//     }

//     try {
//         // Generate hash for status check request
//         const statusCheckParameters = {
//             paymentReferenceNo: unique_id
//         };
        
//         const statusCheckHash = generateHash(merchantId, statusCheckParameters, 'sha512', secretKey);

//         if (!statusCheckHash) {
//             return NextResponse.json({ message: 'Failed to generate status check hash' }, { status: 500 });
//         }

//         const response = await fetch(`https://api.ketlacollect.com/v1/pg/check-payout-transaction-status`, {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'merchantID': merchantId,
//                 'secretkey': secretKey
//             },
//             body: JSON.stringify({
//                 paymentReferenceNo: unique_id,
//                 hash: statusCheckHash  // Use the newly generated hash
//             })
//         });

//         const text = await response.text();
//         const data = JSON.parse(text);

//         console.log("Katla status check response:", data);
//         const status = data.data[0].updatedStatus?.toUpperCase();

//         if(data.data[0].updatedStatus === 'Accepted By Portal' || data.data[0].utrId === null){
//             return NextResponse.json({ message: 'Transaction is still pending' }, { status: 200 });
//         }


//         if (response.ok) {
//             const updatedTransaction = await prisma.transactions.update({
//                 where: {
//                     id: id
//                 },
//                 data: {
//                     transactionStatus: status === 'SUCCESS' ? 'COMPLETED' : status === 'PENDING' ? 'PENDING' : 'FAILED',
//                     utr: data.data[0].utrId ,
//                 }
//             });

//             return NextResponse.json(data, { status: 200 });
//         } else {
//             return NextResponse.json(data, { status: response.status });
//         }
//     } catch (error) {
//         return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
//     }
// };
export const getBalances = async () => {
    const merchantId = process.env.KATLA_MERCHANT_ID; 
    const secretKey = process.env.KATLA_SECRET_KEY;

    const fetchBalance = async () => {
        try {
            const response = await fetch(`https://api.ketlacollect.com/v1/pg/balance`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'merchantID': merchantId,
                    'secretkey': secretKey
                },
            });

            const data = await response.json();
            console.log("Balance response:", data);

            if (response.ok ) {
                return { data: { currentBalance: parseFloat(data.data.currentBalance) } }; // Parse to float
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

export const dmtStatus = async (req, res) => {
    const { unique_id, id } = await req.json();

    const merchantId = process.env.KATLA_MERCHANT_ID; 
    const secretKey = process.env.KATLA_SECRET_KEY;

    const transaction = await prisma.transactions.findUnique({
        where: { id }
    });

    if (!transaction) {
        return NextResponse.json({ message: 'Transaction not found' }, { status: 404 });
    }

    if (transaction.transactionType !== 'DMT') {
        return NextResponse.json({ message: 'Not a DMT transaction' }, { status: 400 });
    }

    try {
        // Generate hash
        const statusCheckParameters = { paymentReferenceNo: unique_id };
        const statusCheckHash = generateHash(merchantId, statusCheckParameters, 'sha512', secretKey);

        if (!statusCheckHash) {
            return NextResponse.json({ message: 'Failed to generate status check hash' }, { status: 500 });
        }

        const response = await fetch(`https://api.ketlacollect.com/v1/pg/check-payout-transaction-status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'merchantID': merchantId,
                'secretkey': secretKey
            },
            body: JSON.stringify({
                paymentReferenceNo: unique_id,
                hash: statusCheckHash
            })
        });

        const text = await response.text();
        const data = JSON.parse(text);

        console.log("Katla status check response:", data);

        const rawStatus = data?.data?.[0]?.updatedStatus?.toUpperCase() || null;
        const utrId = data?.data?.[0]?.utrId || null;

        if (!rawStatus) {
            return NextResponse.json({ message: 'Unknown status received', raw: data }, { status: 200 });
        }

        let mappedStatus = null;

        if (['SUCCESS', 'COMPLETED', 'SETTLED'].includes(rawStatus)) {
            mappedStatus = 'COMPLETED';
        } else if (['FAILED', 'REJECTED', 'DECLINED','FAILURE'].includes(rawStatus)) {
            mappedStatus = 'FAILED';
        } else if (['PENDING', 'PROCESSING', 'ACCEPTED BY PORTAL'].includes(rawStatus)) {
            return NextResponse.json({ message: 'Transaction is still in process', rawStatus }, { status: 200 });
        } else {
            // Unknown status → treat as "in process"
            return NextResponse.json({ message: 'Transaction in process (unmapped status)', rawStatus }, { status: 200 });
        }

        // Only update if COMPLETED or FAILED
        await prisma.$transaction(async (tx) => {
            await tx.transactions.update({
                where: { id },
                data: {
                    transactionStatus: mappedStatus,
                    utr: utrId,
                }
            });

            if (mappedStatus === 'FAILED') {
                await tx.user.update({
                    where: { id: transaction.senderId },
                    data: { balance: { increment: transaction.amount } },
                });
            }
        });

        return NextResponse.json({ message: 'Transaction updated', status: mappedStatus, utr: utrId }, { status: 200 });

    } catch (error) {
        console.error("Error in dmtStatus:", error);
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
};
