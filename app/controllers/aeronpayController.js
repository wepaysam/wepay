import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';
import crypto from 'crypto';
import { Decimal } from '@prisma/client/runtime/library'; // Import Decimal for calculations
import { se } from 'date-fns/locale';

export const upiPayment = async (req) => {
  const requestId = crypto.randomUUID();
//   console.log(`[${requestId}] AeronPay UPI payout request received.`);

  try {
    const { amount: rawAmount, beneficiary, websiteUrl, utr } = await req.json();
    const userId =  req.user.id ;
    const existingTransaction = await prisma.transactions.findFirst({
        where: {
            transactionId: utr,
        },
    });

    if (existingTransaction) {
        return NextResponse.json({ message: 'Transaction ID already exists' }, { status: 400 });
    }

    const amount = new Decimal(rawAmount);

    console.log(`[${requestId}] Processing AeronPay UPI payout. UserID: ${userId}, Beneficiary: ${beneficiary.upiId}, Amount: ${amount}`);

    if (amount.isNaN() || amount.isNegative() || amount.isZero() || !beneficiary || !beneficiary.id || !beneficiary.upiId || !beneficiary.accountHolderName) {
        console.warn(`[${requestId}] Invalid request body. Amount or Beneficiary details invalid.`);
        return NextResponse.json({ message: 'A valid Amount and Beneficiary details are required.' }, { status: 400 });
    }


    const [user] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } })
    ]);

    if (!user) {
      console.error(`[${requestId}] CRITICAL: Authenticated UserID: ${userId} not found.`);
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    // if (!upiBeneficiary) {
    //   console.warn(`[${requestId}] UPI Beneficiary with ID: ${beneficiary.id} not found.`);
    //   return NextResponse.json({ message: 'UPI Beneficiary not found' }, { status: 404 });
    // }
    
    // --- Step 2: Calculate Transaction Charges (Placeholder for UPI specific charges) ---
    // (Your existing charge calculation logic remains commented out)

    // --- Step 3: Validate User Balance ---
    // (Your existing balance validation logic remains commented out)

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
        transactionId: utr,
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

    // --- Step 5: Process API Response ---
    // *** MODIFIED SUCCESS CONDITION HERE ***
    // We now check if AeronPay's *internal* statusCode is 200 or 201 AND their *internal* status is SUCCESS or PENDING.
    // We also make sure the HTTP response status from AeronPay is generally successful (2xx range).
    if ( response.ok && (payoutResult.statusCode === 200 || payoutResult.statusCode === '201') && (payoutResult.status === 'SUCCESS' || payoutResult.status === 'PENDING') ) {
      // SUCCESS/PENDING PATH: Record the transaction with the correct status
      console.log(`[${requestId}] AeronPay UPI reported SUCCESS or PENDING. Starting database transaction.`);
      
      const transactionStatus = payoutResult.status === 'SUCCESS' ? 'SUCCESS' : 'PENDING';

      await prisma.$transaction(async (tx) => {
        // if(payoutResult.status === 'SUCCESS'){
        //   await tx.user.update({
        //   where: { id: userId },
        //   data: { balance: { decrement: totalDebitAmount } },
        // });
        // }
        await tx.transactions.create({
          data: {
            upiBeneficiary: { connect: { id: beneficiary.id } },
            sender:{ connect: { id: userId } },
            amount: amount,
            chargesAmount: 0,
            transactionType: 'UPI',
            transactionStatus: transactionStatus, // Set to PENDING or SUCCESS based on payoutResult.status
            senderAccount: beneficiary.upiId,
            transaction_no: payoutResult.data?.transactionId,
            referenceNo: requestId,
            websiteUrl: websiteUrl,
            transactionId: utr, // Use AeronPay // Use payoutResult.data.utr or transactionId
            gateway: 'AeronPay',
          },
        });
      });
      console.log(`[${requestId}] Database transaction completed successfully with status: ${transactionStatus}.`);
      
      // Return the AeronPay response directly to the frontend, which will have the PENDING status and message
      return NextResponse.json(payoutResult);
    }
    
    // FAILURE PATH: Record the failed attempt, but DO NOT update balance
    console.warn(`[${requestId}] AeronPay UPI payout failed or an unexpected status was returned.`);
    await prisma.transactions.create({
      data: {
        upiBeneficiary: { connect: { id: beneficiary.id } },
        sender:{ connect: { id: userId } },
        amount: amount,
        chargesAmount: 0,
        transactionType: 'UPI',
        transactionStatus: 'FAILED',
        senderAccount: beneficiary.upiId,
        transaction_no: payoutResult.data?.transactionId || requestId, // Use payoutResult.data.transactionId if available
        utr: payoutResult.data?.utr || payoutResult.data?.transactionId || 'N/A',
        gateway: 'AeronPay',
      },
    });
    console.log(`[${requestId}] Logged FAILED AeronPay UPI transaction.`);

    const errorMessage =  payoutResult.message || 'The UPI payment was rejected by AeronPay.';
    
    return NextResponse.json(
      { message: errorMessage, ...payoutResult }, 
      { status: response.status >= 400 ? response.status : 400 }
    );

  } catch (error) {
    console.error(`[${requestId}] --- UNHANDLED GLOBAL ERROR IN AERONPAY UPI PAYOUT HANDLER ---`, error);
    
    if (error.name === 'AbortError') {
        return NextResponse.json({ message: 'Request timed out.' }, { status: 408 });
    }
    if (error instanceof TypeError) {
        return NextResponse.json({ message: 'A network error occurred. Please try again.' }, { status: 503 });
    }
    if (Decimal.isDecimal(error)) {
        return NextResponse.json({ message: 'A decimal-related processing error occurred.' }, { status: 500 });
    }

    // In case of an unhandled error, we try to create a FAILED transaction.
    // We need to be careful here as upiBeneficiary might not be defined if the error happened early.
    // let upiBeneficiaryIdForError = null;
    // try {
    //     const { beneficiary } = await req.json(); // Re-parse to get beneficiary if available
    //     upiBeneficiaryIdForError = beneficiary?.id;
    // } catch (parseError) {
    //     // If parsing fails, beneficiaryId will remain null
    // }

    await prisma.transactions.create({
        data: { 
            // Only connect if upiBeneficiaryIdForError is valid
            upiBeneficiary: { connect: { id: upiBeneficiaryIdForError } },
            amount: new Decimal(0), // Can't reliably get amount if error is early
            chargesAmount: new Decimal(0), 
            transactionType: 'UPI', 
            transactionStatus: 'FAILED',
            sender: { connect: { id: userId } },
            transaction_no: requestId,
            utr: 'N/A',
            gateway: 'AeronPay',
        }
    });

    const errorMessage = error.message || 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
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
             await prisma.transactions.update({
                where: {
                    id: id
                },
                data: {
                    transactionStatus: data.data.status === 'SUCCESS' ? 'COMPLETED' : data.data.status === 'PENDING' ? 'PENDING' : 'FAILED',
                    utr: data.data.third_party_no || data.data.transaction_no,
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
            return NextResponse.json(data, { status: 200 });
        } else {
            return NextResponse.json(data, { status: response.status });
        }
    } catch (error) {
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
};