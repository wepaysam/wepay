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
    const { amount: rawAmount, beneficiary } = await req.json();
    const userId = req.user ? req.user.id : beneficiary.userId; // Get userId from auth context or beneficiary

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
    const chargeRule = await prisma.transactionCharge.findFirst({
      where: {
        minAmount: { lte: amount },
        maxAmount: { gte: amount },
      },
    });

    const transactionCharge = chargeRule ? new Decimal(chargeRule.charge) : new Decimal(0);
    const totalDebitAmount = amount.add(transactionCharge);
    console.log(`[${requestId}] Amount: ${amount}, Charge: ${transactionCharge}, Total Debit: ${totalDebitAmount}`);

    // --- Step 3: Validate User Balance ---
    if (user.balance < totalDebitAmount) {
      console.warn(`[${requestId}] Insufficient balance for UserID: ${userId}. Balance: ${user.balance}, Required: ${totalDebitAmount}`);
      return NextResponse.json({ message: 'Insufficient balance' }, { status: 400 });
    }

    // --- Step 4: Call External AeronPay UPI Payout API ---
    const payload = {
        bankProfileId:"1",
        transferMode:"upi",
        accountNumber:"9001770984",
        amount: amount.toNumber(), // Convert Decimal to number for API
        client_referenceId: requestId,
        // Assuming AeronPay UPI API expects VPA and name
        // vpa: upiBeneficiary.upiId,
        // name: upiBeneficiary.accountHolderName,
        // Add any other required fields for AeronPay UPI API
        // e.g., user.email, user.phoneNumber, remarks, etc.
        // email: user.email || '',
        // phone: user.phoneNumber || '',
        remarks: 'UPI Payout',
        beneDetails:{
            vpa: upiBeneficiary.upiId,
            name: upiBeneficiary.accountHolderName,
            email: 'support@wepayx.com',
            phone: '9001770984'
        },
        latitude: '20.1236',
        longitude: '78.1228'
    };

    console.log(`[${requestId}] Sending payload to AeronPay UPI:`, JSON.stringify(payload, null, 2));
    
    let response;
    let payoutResult;
    try {
        // REPLACE WITH ACTUAL AERONPAY UPI API ENDPOINT AND HEADERS
        response = await fetch( 'https://api.aeronpay.in/api/serviceapi-prod/api/payout/upi', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'client-id': process.env.AERONPAY_CLIENT_ID ,
                'client-secret': process.env.AERONPAY_CLIENT_SECRET ,
                // Add any other required headers
            },
            body: JSON.stringify(payload),
        });
        payoutResult = await response.json();
    } catch (apiError) {
        console.error(`[${requestId}] Network or fetch error calling AeronPay UPI API:`, apiError);
        // Record a FAILED transaction on network error
        await prisma.transactions.create({
            data: { 
                senderId: userId, 
                upiBeneficiaryId: upiBeneficiary.id, 
                amount, 
                chargesAmount: transactionCharge, 
                transactionType: 'UPI', 
                transactionStatus: 'FAILED',
                senderAccount: user.email || user.phoneNumber, // Or another identifier
                transaction_no: requestId,
                utr: 'N/A',
                gateway: 'AeronPay',
            }
        });
        return NextResponse.json({ message: 'Failed to connect to the payment provider.' }, { status: 503 });
    }

    console.log(`[${requestId}] AeronPay UPI API response received. Status: ${response.status}, Body:`, payoutResult);

    // --- Step 5: Process API Response ---
    // Adjust success condition based on AeronPay UPI API response
    if (response.ok && payoutResult.status === 'SUCCESS') {
      // SUCCESS PATH: Record the transaction and update balance
      console.log(`[${requestId}] AeronPay UPI reported SUCCESS. Starting database transaction.`);
      try {
        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: userId },
            data: { balance: { decrement: totalDebitAmount } },
          });

          await tx.transactions.create({
            data: {
              senderId: userId,
              upiBeneficiaryId: upiBeneficiary.id,
              amount: amount,
              chargesAmount: transactionCharge,
              transactionType: 'UPI',
              transactionStatus: 'COMPLETED',
              senderAccount: user.email || user.phoneNumber, // Or another identifier
              transaction_no: payoutResult.transaction_no || requestId, // Adjust based on AeronPay response
              utr: payoutResult.utr || payoutResult.transaction_no || 'N/A', // Adjust based on AeronPay response
              gateway: 'AeronPay',
            },
          });
        });
        console.log(`[${requestId}] Database transaction completed successfully.`);
        return NextResponse.json(payoutResult);
      } catch (txError) {
        console.error(`[${requestId}] CRITICAL: DB transaction failed after successful AeronPay UPI payout! Manual intervention required.`, txError);
        return NextResponse.json({ message: 'Payout successful, but failed to update records. Please contact support.', payoutData: payoutResult }, { status: 500 });
      }
    } else {
      // FAILURE PATH: Record the failed attempt, but DO NOT update balance
      console.warn(`[${requestId}] AeronPay UPI payout failed.`);
      await prisma.transactions.create({
        data: {
          senderId: userId,
          upiBeneficiaryId: upiBeneficiary.id,
          amount: amount,
          chargesAmount: transactionCharge,
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
    }

  } catch (error) {
    console.error(`[${requestId}] --- UNHANDLED GLOBAL ERROR IN AERONPAY UPI PAYOUT HANDLER ---`, error);
    const errorMessage = Decimal.isDecimal(error) ? 'A decimal-related processing error occurred.' : (error.message || 'An unexpected error occurred.');
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
};