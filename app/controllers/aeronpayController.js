import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';
import crypto from 'crypto';
import { Decimal } from '@prisma/client/runtime/library'; // Import Decimal for calculations

export const upiPayment = async (req) => {
  const requestId = crypto.randomUUID();
//   console.log(`[${requestId}] AeronPay UPI payout request received.`);

  try {
    // Assuming authentication and user details are handled by a middleware before this function
    // For now, we'll get userId from the request if available, or assume it's passed in body for testing
    const { amount: rawAmount, beneficiary, websiteUrl, utr } = await req.json();
    const userId =  req.user.id ; // Get userId from auth context or beneficiary
    const existingTransaction = await prisma.transactions.findFirst({
        where: {
            transactionId: utr,
        },
    });

    if (existingTransaction) {
        return NextResponse.json({ message: 'Transaction ID already exists' }, { status: 400 });
    }

    // Ensure amount is a valid Decimal
    const amount = new Decimal(rawAmount);

    console.log(`[${requestId}] Processing AeronPay UPI payout. UserID: ${userId}, Beneficiary: ${beneficiary.upiId}, Amount: ${amount}`);

    if (amount.isNaN() || amount.isNegative() || amount.isZero() || !beneficiary || !beneficiary.id || !beneficiary.upiId || !beneficiary.accountHolderName) {
        console.warn(`[${requestId}] Invalid request body. Amount or Beneficiary details invalid.`);
        return NextResponse.json({ message: 'A valid Amount and Beneficiary details are required.' }, { status: 400 });
    }

    // --- Step 1: Fetch User and UPI Beneficiary ---
    const [user, upiBeneficiary] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.upiBeneficiary.findUnique({ where: { id: beneficiary.id } })
    ]);

    if (!user) {
      console.error(`[${requestId}] CRITICAL: Authenticated UserID: ${userId} not found.`);
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    if (!upiBeneficiary) {
      console.warn(`[${requestId}] UPI Beneficiary with ID: ${beneficiary.id} not found.`);
      return NextResponse.json({ message: 'UPI Beneficiary not found' }, { status: 404 });
    }
    
    // --- Step 2: Calculate Transaction Charges (Placeholder for UPI specific charges) ---
    // You might have different charge rules for UPI vs. IMPS
    // const chargeRule = await prisma.transactionCharge.findFirst({
    //   where: {
    //     minAmount: { lte: amount },
    //     maxAmount: { gte: amount },
    //   },
    // });

    // const transactionCharge = chargeRule ? new Decimal(chargeRule.charge) : new Decimal(0);
    // const totalDebitAmount = amount.add(transactionCharge);
    // console.log(`[${requestId}] Amount: ${amount}, Charge: ${transactionCharge}, Total Debit: ${totalDebitAmount}`);

    // --- Step 3: Validate User Balance ---
    // if (user.balance > totalDebitAmount) {
    //   console.warn(`[${requestId}] Insufficient balance for UserID: ${userId}. Balance: ${user.balance}, Required: ${totalDebitAmount}`);
    //   return NextResponse.json({ message: 'Insufficient balance' }, { status: 400 });
    // }

    // --- Step 4: Call External AeronPay UPI Payout API ---
    const payload = {
        bankProfileId:"1",
        transferMode:"upi",
        accountNumber:"9001770984",
        amount: amount.toNumber(), // Convert Decimal to number for API
        client_referenceId: requestId,
        remarks: 'UPI Payout',
        beneDetails:{
            vpa: upiBeneficiary.upiId,
            name: upiBeneficiary.accountHolderName,
            email: 'support@wepayx.com',
            phone: '9001770984',
            address1: "Mumbai"
        },
        latitude: '20.1236',
        longitude: '78.1228',
        websiteUrl: websiteUrl,
        utr: utr,
    };

    console.log(`[${requestId}] Sending payload to AeronPay UPI:`, JSON.stringify(payload, null, 2));
    
    // REPLACE WITH ACTUAL AERONPAY UPI API ENDPOINT AND HEADERS
    const response = await fetch( 'https://api.aeronpay.in/api/serviceapi-prod/api/payout/upi', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'client-id': process.env.AERONPAY_CLIENT_ID ,
            'client-secret': process.env.AERONPAY_CLIENT_SECRET ,
            // Add any other required headers
        },
        body: JSON.stringify(payload),
    });
    const payoutResult = await response.json();

    console.log(`[${requestId}] AeronPay UPI API response received. Status: ${response.status}, Body:`, payoutResult);

    // --- Step 5: Process API Response ---
    // Modified condition to accept both 200 and 201 status codes
    if ((payoutResult.statusCode === '200' || payoutResult.statusCode === '201') && 
        (payoutResult.status === 'SUCCESS' || payoutResult.status === 'PENDING')) {
      
      console.log(`[${requestId}] AeronPay UPI reported ${payoutResult.status}. Starting database transaction.`);
      
      await prisma.$transaction(async (tx) => {
        await tx.transactions.create({
          data: {
            upiBeneficiaryId: upiBeneficiary?.id,
            amount: amount,
            chargesAmount: 0,
            transactionType: 'UPI',
            description: 'AeronPay UPI Payout',
            transactionStatus: payoutResult.status, // This will now store 'PENDING' status
            senderAccount: user.email || user.phoneNumber,
            transaction_no: payoutResult.data?.transactionId || utr, // Using AeronPay transactionId
            utr: payoutResult.data?.utr || 'PENDING', // UTR will be updated later
            gateway: 'AeronPay',
            remarks: payoutResult.message || 'Transaction Under Process',
            aeronpayTransactionId: payoutResult.data?.transactionId, // Store AeronPay's transaction ID
            clientReferenceId: payoutResult.data?.client_referenceId
          },
        });
      });

      console.log(`[${requestId}] Database transaction completed successfully with PENDING status.`);
      
      // Return success response even for PENDING status
      return NextResponse.json({
        status: 'SUCCESS',
        message: 'Transaction initiated successfully',
        data: {
          ...payoutResult.data,
          status: payoutResult.status,
          transaction_no: payoutResult.data?.transactionId
        }
      });
    }
    
    // FAILURE PATH: Record the failed attempt, but DO NOT update balance
    console.warn(`[${requestId}] AeronPay UPI payout failed.`);
    await prisma.transactions.create({
      data: {
        upiBeneficiaryId: upiBeneficiary.id,
        amount: amount,
        chargesAmount: 0,
        transactionType: 'UPI',
        transactionStatus: 'FAILED',
        senderAccount: user.email || user.phoneNumber,
        transaction_no: payoutResult.transaction_no || requestId, // Adjust based on AeronPay response
        utr: payoutResult.utr || payoutResult.transaction_no || 'N/A', // Adjust based on AeronPay response
        gateway: 'AeronPay',
      },
    });
    console.log(`[${requestId}] Logged FAILED AeronPay UPI transaction.`);

    // Extract the specific error message for the frontend
    const errorMessage = payoutResult.description || payoutResult.message || 'The UPI payment was rejected by AeronPay.';
    
    return NextResponse.json(
      { message: errorMessage, ...payoutResult }, 
      { status: response.status >= 400 ? response.status : 400 }
    );

  } catch (error) {
    console.error(`[${requestId}] --- UNHANDLED GLOBAL ERROR IN AERONPAY UPI PAYOUT HANDLER ---`, error);
    
    // Handle specific errors
    if (error.name === 'AbortError') {
        return NextResponse.json({ message: 'Request timed out.' }, { status: 408 });
    }
    if (error instanceof TypeError) {
        return NextResponse.json({ message: 'A network error occurred. Please try again.' }, { status: 503 });
    }
    if (Decimal.isDecimal(error)) {
        return NextResponse.json({ message: 'A decimal-related processing error occurred.' }, { status: 500 });
    }

    // Record a FAILED transaction on network error
    await prisma.transactions.create({
        data: { 
            sender: { connect: { id: req.user.id } }, 
            upiBeneficiary: { connect: { id: upiBeneficiary.id } }, 
            amount: new Decimal(0), 
            chargesAmount: new Decimal(0), 
            transactionType: 'UPI', 
            transactionStatus: 'FAILED',
            senderAccount: req.user ? req.user.email || req.user.phoneNumber : 'N/A', // Or another identifier
            transaction_no: requestId,
            utr: 'N/A',
            gateway: 'AeronPay',
            remarks: 'Unhandled exception occurred'
        }
    });

    const errorMessage = error.message || 'An unexpected error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
};

export const AeronpayStatus = async (req, res) => {
    const { unique_id } = await req.json();

    try {
        const response = await fetch(`https://api.aeronpay.in/api/serviceapi-prod/api/reports/transactionStatus`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'client-id': process.env.AERONPAY_CLIENT_ID ,
                'client-secret': process.env.AERONPAY_CLIENT_SECRET ,
            },
            body: JSON.stringify({
                client_referenceId: unique_id,
                accountNumber:"9001770984"
            })
        });

        const text = await response.text();
        const data = JSON.parse(text);

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
            return NextResponse.json(data, { status: response.status });
        }
    } catch (error) {
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
};

export const AeronpayBalance = async (req, res) => {
    const { unique_id } = await req.json();

    try {
        const response = await fetch(`https://api.aeronpay.in/api/serviceapi-prod/api/balance/check_balance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'client-id': process.env.AERONPAY_CLIENT_ID ,
                'client-secret': process.env.AERONPAY_CLIENT_SECRET ,
            },
            body: JSON.stringify({
                client_referenceId: unique_id,
                accountNumber:"9001770984",
                account_type:"Merchant",
                merchant_id:"97009362986"

            })
        });

        const text = await response.text();
        const data = JSON.parse(text);

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
            return NextResponse.json(data, { status: response.status });
        }
    } catch (error) {
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
};