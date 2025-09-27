import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';
import crypto from 'crypto';
import { Decimal } from '@prisma/client/runtime/library'; // Import Decimal for calculations
import { se } from 'date-fns/locale';

const cardTypes = {
  CRDVSA: "Visa Card",
  CRDMST: "Master Card",
  CRDRUPAY: "Rupay Card",
  CRDAMX: "American Express",
  CRDDC: "Diners Club Card"
};


export const upiPayment = async (req) => {
//   const requestId = crypto.randomUUID();
    const requestId = Date.now().toString() + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');

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
//   console.log(`[${requestId}] AeronPay UPI payout request received.`);

  try {
    const { amount: rawAmount, beneficiary, websiteUrl } = await req.json();
    const userId =  req.user.id ;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { upiPermissions: true ,balance:true, isDisabled: true, phoneNumber: true } });

        // console.log("user details ak",user);

    if (user.isDisabled) {
      return NextResponse.json({ message: 'You are not allowed to use this service right now.' }, { status: 403 });
    }

    if (!user) {
      console.error(`[${requestId}] CRITICAL: Authenticated UserID: ${userId} not found.`);
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
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

    

    const amount = new Decimal(rawAmount);

    if (amount.isNaN() || amount.isNegative() || amount.isZero()) {
        console.warn(`[${requestId}] Invalid request body. Amount is invalid.`);
        return NextResponse.json({ message: 'A valid Amount is required.' }, { status: 400 });
    }

    const chargeRule = await prisma.transactionCharge.findFirst({
        where: {
          type: 'UPI',
          minAmount: { lte: amount },
          maxAmount: { gte: amount },
        },
      });
  
    const transactionCharge = chargeRule ? new Decimal(chargeRule.charge) : new Decimal(0);
    const totalDebitAmount = amount.add(transactionCharge);

    // console.log("akash asmple",user);
    // Check if user has UPI Aeronpay permission
    if (!user.upiPermissions?.enabled || !user.upiPermissions?.aeronpay) {
        console.log("akash asmple",user.upiPermissions);
      console.warn(`[${requestId}] User ${userId} does not have UPI Aeronpay permission.`);
      return NextResponse.json({ message: 'You do not have permission to perform UPI Aeronpay transactions.' }, { status: 403 });
    }

    // --- Step 3: Atomically Reserve Funds and Create Pending Transaction ---
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
            sender:{ connect: { id: userId } },
            upiBeneficiary:{ connect: { id: beneficiary.id } },
            amount: amount,
            chargesAmount: transactionCharge,
            transactionType: 'UPI',
            transactionStatus: 'PENDING', // Initially PENDING
            senderAccount: user.phoneNumber, // Using phone number as sender account
            websiteUrl: websiteUrl,
            referenceNo: requestId,
            transactionId: transactionId,
            gateway: 'AeronPay'
          },
        });
      });
      console.log(`[${requestId}] Funds reserved and pending transaction ${transactionRecord.id} created.`);
    } catch (dbError) {
      console.error(`[${requestId}] Failed to reserve funds or create pending transaction:`, dbError);
      return NextResponse.json({ message: dbError.message || 'Failed to process payment due to a database error.' }, { status: 400 });
    }

    // --- Step 4: Call External AeronPay UPI Payout API ---
    const payload = {
        bankProfileId:"1",
        transferMode:"upi",
        accountNumber:"9001770984",
        amount: amount.toNumber(), // Convert Decimal to number for API
        client_referenceId: requestId,
        remarks: 'UPI Payout',
        beneDetails:{
            vpa: beneficiary.upiId,
            name: beneficiary?.accountHolderName,
            email: 'support@wepayx.com',
            phone: '9001770984',
            address1: "Mumbai"
        },
        latitude: '20.1236',
        longitude: '78.1228',
        websiteUrl: websiteUrl,
        transactionId: transactionId,
    };

    console.log(`[${requestId}] Sending payload to AeronPay UPI:`, JSON.stringify(payload, null, 2));
    
    const response = await fetch( 'https://api.aeronpay.in/api/serviceapi-prod/api/payout/upi', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'client-id': process.env.AERONPAY_CLIENT_ID ,
            'client-secret': process.env.AERONPAY_CLIENT_SECRET ,
        },
        body: JSON.stringify(payload),
    });
    const payoutResult = await response.json();

    console.log(`[${requestId}] AeronPay UPI API response received. Status: ${response.status}, Body:`, payoutResult);

    // --- Step 5: Process API Response and Finalize Transaction ---
    if ( response.ok && (payoutResult.statusCode === 200 || payoutResult.statusCode === '201') && (payoutResult.status === 'SUCCESS' || payoutResult.status === 'PENDING') ) {
      // SUCCESS/PENDING PATH: Update pending transaction to COMPLETED/PENDING based on API result
      console.log(`[${requestId}] AeronPay UPI reported SUCCESS or PENDING. Finalizing transaction.`);
      try {
        await prisma.transactions.update({
          where: { id: transactionRecord.id },
          data: {
            transactionStatus: payoutResult.status === 'SUCCESS' ? 'COMPLETED' : 'PENDING',
            transaction_no: payoutResult.data?.transactionId, // Update with actual gateway transaction ID
            utr: payoutResult.data?.utr || payoutResult.data?.transactionId || 'N/A',
          },
        });
        console.log(`[${requestId}] Transaction ${transactionRecord.id} finalized successfully.`);
        return NextResponse.json(payoutResult);
      } catch (txError) {
        console.error(`[${requestId}] CRITICAL: Failed to finalize transaction ${transactionRecord.id} after successful payout! Manual intervention required.`, txError);
        return NextResponse.json({ message: 'Payout successful, but failed to update records. Please contact support.', payoutData: payoutResult }, { status: 500 });
      }
    } else {
      // FAILURE PATH: Revert funds and mark transaction as FAILED
      console.warn(`[${requestId}] AeronPay UPI payout failed. Reverting funds.`);
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
        console.log(`[${requestId}] Funds reverted and transaction ${transactionRecord.id} marked FAILED due to AeronPay failure.`);
      } catch (revertError) {
        console.error(`[${requestId}] CRITICAL: Failed to revert funds after AeronPay failure! Manual intervention required for transaction ${transactionRecord.id}.`, revertError);
      }

      const errorMessage =  payoutResult.message || 'The UPI payment was rejected by AeronPay.';
      
      return NextResponse.json(
        { message: errorMessage, ...payoutResult }, 
        { status: response.status >= 400 ? response.status : 400 }
      );
    }

  } catch (error) {
    console.error(`[${requestId}] --- UNHANDLED GLOBAL ERROR IN AERONPAY UPI PAYOUT HANDLER ---`, error);
    
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
        console.log(`[${requestId}] Funds reverted and transaction ${transactionRecord.id} marked FAILED due to global error.`);
      } catch (revertError) {
        console.error(`[${requestId}] CRITICAL: Failed to revert funds after global error! Manual intervention required for transaction ${transactionRecord.id}.`, revertError);
      }
    }

    if (error.name === 'AbortError') {
        return NextResponse.json({ message: 'Request timed out.' }, { status: 408 });
    }
    if (error instanceof TypeError) {
        return NextResponse.json({ message: 'A network error occurred. Please try again.' }, { status: 503 });
    }
    if (Decimal.isDecimal(error)) {
        return NextResponse.json({ message: 'A decimal-related processing error occurred.' }, { status: 500 });
    }

    const errorMessage = error.message || 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  };
};
export const checkStatus = async (req, res) => {
    const { unique_id, id } = await req.json();
    console.log("AeronPay checkStatus request received:", { unique_id, id });

    try {
        const payload = {
            client_referenceId: unique_id,
            mobile:"9001770984"
        };
        console.log('payload',payload)
        const response = await fetch(`https://api.aeronpay.in/api/serviceapi-prod/api/reports/transactionStatus`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'client-id': process.env.AERONPAY_CLIENT_ID ,
                'client-secret': process.env.AERONPAY_CLIENT_SECRET ,
            },
            body: JSON.stringify(payload)
        });

        const text = await response.text();
        const data = JSON.parse(text);
        console.log("AeronPay API response:", data);

        if (response.ok) {
            const transaction = await prisma.transactions.findUnique({ where: { id } });

            if (!transaction) {
                return NextResponse.json({ message: 'Transaction not found' }, { status: 404 });
            }

            const newStatus = data.status === 'SUCCESS' ? 'COMPLETED' : data.status === 'PENDING' ? 'PENDING' : 'FAILED';

            await prisma.$transaction(async (tx) => {
                await tx.transactions.update({
                    where: { id: id },
                    data: {
                        transactionStatus: newStatus,
                        utr: data.utr 
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
            console.error("AeronPay API error:", data);
            return NextResponse.json(data, { status: response.status });
        }
    } catch (error) {
        console.error("Error in AeronPay checkStatus:", error);
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
};

export const AeronpayBalance = async (req, res) => {

    try {
        const response = await fetch(`https://api.aeronpay.in/api/serviceapi-prod/api/balance/check_balance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'client-id': process.env.AERONPAY_CLIENT_ID ,
                'client-secret': process.env.AERONPAY_CLIENT_SECRET ,
            },
            body: JSON.stringify({
                client_referenceId: Date.now().toString(),
                accountNumber:"9001770984",
                account_type:"Merchant",
                merchant_id:"97009362986"
            })
        });

        const text = await response.text();
        const data = JSON.parse(text);

        if (response.ok) {
            // Parse available_balance to float before returning
            const parsedData = { ...data };
            if (parsedData.available_balance !== undefined) {
                parsedData.available_balance = parseFloat(parsedData.available_balance);
            }
            return NextResponse.json(parsedData, { status: 200 });
        } else {
            return NextResponse.json(data, { status: response.status });
        }
    } catch (error) {
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
};

export const AeronpayUPIVerification = async (req, res) => {
    const { vpa} = await req.json();
    // console.log("AeronpayUPIVerification request received:", { vpa });

    // Mocked response for testing
    // const mockResponse = {
    //     status: "success",
    //     statusCode: "101",
    //     partner_id: "ARNPY84XXXXXXX",
    //     name: "Mock User",
    //     description: "VPA verification successful (simulated)",
    //     accountExists: "YES",
    //     clientData: {
    //         client_id: "942wq52xdx82"
    //     }
    // };

    // return NextResponse.json(mockResponse, { status: 200 });
    const requestId = Date.now().toString() + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');

    
    try {
        const response = await fetch(`https://api.aeronpay.in/api/serviceapi-prod/api/verification/upiverify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'client-id': process.env.AERONPAY_CLIENT_ID ,
                'client-secret': process.env.AERONPAY_CLIENT_SECRET ,
            },
            body: JSON.stringify({
                consent:"Y",
                vpa,
                clientData:{
                    client_id: requestId,
                }
            })
        });

        const text = await response.text();
        const data = JSON.parse(text);
        console.log("AeronpayUPIVerification response:", data);

        if (response.ok) {
            return NextResponse.json(data, { status: 200 });
        } else {
            console.error("AeronpayUPIVerification error response:", data);
            return NextResponse.json(data, { status: response.status });
        }
    } catch (error) {
        console.error("Error in AeronpayUPIVerification:", error);
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
    
};

export const AeronpayGSTVerification = async (req, res) => {
    const { id_number} = await req.json();
    try {
        const response = await fetch(`https://api.aeronpay.in/api/serviceapi-prod/api/verification/upiverify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'client-id': process.env.AERONPAY_CLIENT_ID ,
                'client-secret': process.env.AERONPAY_CLIENT_SECRET ,
            },
            body: JSON.stringify({
                id_number,
                filing_status:true,
                client_referenceId: Date.now().toString(),
            })
        });

        const text = await response.text();
        const data = JSON.parse(text);

            

        if (response.ok) {
            return NextResponse.json(data, { status: 200 });
        } else {
            return NextResponse.json(data, { status: response.status });
        }
    } catch (error) {
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
};


export const AeronpayMobileOperatorFetch = async (req, res) => {
    const { mobile} = await req.json();

    const requestId = Date.now().toString() + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');

    try {
        const response = await fetch(`https://api.aeronpay.in/api/serviceapi-prod/api/verification/mobile_operator`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'client-id': process.env.AERONPAY_CLIENT_ID ,
                'client-secret': process.env.AERONPAY_CLIENT_SECRET ,
            },
            body: JSON.stringify({
                consent:"Y",
                mobile,
                clientData:{
                    client_id: requestId,
                }
            })
        });

        const text = await response.text();
        const data = JSON.parse(text);
        console.log("AeronpayMobileOperatorFetch response:", data);
        // sample output
        // {
        //     "status": "success",
        //     "status-code": "101",
        //     "customer_mobile": "6633663399",
        //     "operator_name": "Jio",
        //     "operator_circle": "Rajasthan",
        //     "postpaid_status": false,
        //     "operator_status": "",
        //     "mnp_status": null,
        //     "partner_id": "ARNPY17385967753735",
        //     "clientData": {
        //     "client_id": "APAY1738596774RAVn6T3GDZ"
        //     }
        // }

            

        if (response.ok) {
            return NextResponse.json(data, { status: 200 });
        } else {
            return NextResponse.json(data, { status: response.status });
        }
    } catch (error) {
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
};

export const AeronpayMobilePlanFetch = async (req, res) => {
    const { mobile} = await req.json();
    try {
        const response = await fetch(`https://api.aeronpay.in/api/serviceapi-prod/api/utility/recharge/plan_fetch/operator_code={operator_name}/circle_id={circle_id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'client-id': process.env.AERONPAY_CLIENT_ID ,
                'client-secret': process.env.AERONPAY_CLIENT_SECRET ,
            },
            body: JSON.stringify({
                consent:"Y",
                mobile,
            })
        });

        const text = await response.text();
        const data = JSON.parse(text);
        console.log("AeronpayMobilePlanFetch response:", data);
        // sample output
        // {
        //     "status": "success",
        //     "status-code": "101",
        //     "customer_mobile": "6633663399",
        //     "operator_name": "Jio",
        //     "operator_circle": "Rajasthan",
        //     "postpaid_status": false,
        //     "operator_status": "",
        //     "mnp_status": null,
        //     "partner_id": "ARNPY17385967753735",
        //     "clientData": {
        //     "client_id": "APAY1738596774RAVn6T3GDZ"
        //     }
        // }

            

        if (response.ok) {
            return NextResponse.json(data, { status: 200 });
        } else {
            return NextResponse.json(data, { status: response.status });
        }
    } catch (error) {
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
};

export const AeronpaycreditcardVerification = async (req, res) => {
    const { cardNumber ,name,mobile} = await req.json();
    try {
        const response = await fetch(`https://api.aeronpay.in/api/serviceapi-prod/api/utility/ccpayment/creditcard_fetch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'client-id': process.env.AERONPAY_CLIENT_ID ,
                'client-secret': process.env.AERONPAY_CLIENT_SECRET ,
            },
            body: JSON.stringify({
                consent:"Y",
                phone:mobile,
                cardNumber,
                name,
            })
        });

        const text = await response.text();
        const data = JSON.parse(text);
        console.log("AeronpaycreditcardVerification response:", data);

        if (response.ok) {
            if (data.cardType !== 'credit') {
                return NextResponse.json({ message: 'Please use a credit card.' }, { status: 400 });
            }
            return NextResponse.json(data, { status: 200 });
        } else {
            return NextResponse.json(data, { status: response.status });
        }
    } catch (error) {
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
};

export const AeronpayCreditPayment = async (req, res) => {
    const { mobile,cardNumber,name,email,amount,cardNetwork} = await req.json();
    const userId =  req.user.id ;

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { isDisabled: true } });

    if (!user) {
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

    try {
        const response = await fetch(`https://api.aeronpay.in/api/serviceapi-prod/api/utility/ccpayment/creditcard`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'client-id': process.env.AERONPAY_CLIENT_ID ,
                'client-secret': process.env.AERONPAY_CLIENT_SECRET ,
            },
            body: JSON.stringify({
                consent:"Y",
                mobile,
                cardNumber,
                name,
                email,
                amount,
                cardNetwork
            })
        });

        const text = await response.text();
        const data = JSON.parse(text);
        console.log("AeronpayCreditPayment response:", data);
                // sample output
                // {
                //     "status": "SUCCESS",
                //     "statusCode": "200",
                //     "message": "Transaction Successful",
                //     "data": {
                //         "transactionId": "ARN4XXXXXXX95584",
                //         "opr_referenceId": "32351XXXX245",
                //         "client_referenceId": "{Unique Reference ID}",
                //         "acknowledged": "1"
                //     }
                // }

            

        if (response.ok) {
            return NextResponse.json(data, { status: 200 });
        } else {
            return NextResponse.json(data, { status: response.status });
        }
    } catch (error) {
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
};