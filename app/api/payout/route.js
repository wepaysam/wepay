import { NextResponse } from 'next/server';
import { verifiedUserMiddleware } from '../../middleware/authMiddleware';
import prisma from '../../lib/prisma';
import crypto from 'crypto';
import { Decimal } from '@prisma/client/runtime/library'; // Import Decimal for calculations
import { ref } from 'firebase/storage';

export async function POST(request) {
  // const requestId = crypto.randomUUID();
  const requestId = Date.now().toString() + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
  console.log(`[${requestId}] Payout request received.`);

  try {
    const authResult = await verifiedUserMiddleware(request);
    if (authResult) {
      console.warn(`[${requestId}] Authentication failed.`);
      return authResult;
    }

    const { amount: rawAmount, beneficiaryId, websiteUrl, transactionId } = await request.json();
    const userId = req.user?.id; // Get userId from req.user

    // --- Step 1: Fetch User and Beneficiary ---
    const [user, beneficiary] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.beneficiary.findUnique({ where: { id: beneficiaryId } })
    ]);

    // Assuming req.user is populated by middleware and contains dmtPermissions
    if (!user || !user.impsPermissions?.enabled || !user.impsPermissions?.aeronpay) {
        console.warn(`User ${userId || 'Unknown'} does not have DMT permission.`);
        return NextResponse.json({ message: 'You do not have permission to perform DMT transactions.' }, { status: 403 });
    }

    // Ensure amount is a valid number
    const amount = new Decimal(rawAmount);

    if(user?.balance<amount){
      return NextResponse.json({ message: 'Insufficient Balance' }, { status: 403 });
    }

    const existingTransaction = await prisma.transactions.findFirst({
        where: {
            transactionId,
        },
    });

    if (existingTransaction) {
        return NextResponse.json({ message: 'Transaction ID already exists' }, { status: 400 });
    }

    console.log(`[${requestId}] Processing payout. UserID: ${userId}, BeneficiaryID: ${beneficiaryId}, Amount: ${amount}`);

    if (amount.isNaN() || amount.isNegative() || amount.isZero() || !beneficiaryId) {
        console.warn(`[${requestId}] Invalid request body. Amount or BeneficiaryId invalid.`);
        return NextResponse.json({ message: 'A valid Amount and BeneficiaryId are required.' }, { status: 400 });
    }

    

    if (!user) {
      console.error(`[${requestId}] CRITICAL: Authenticated UserID: ${userId} not found.`);
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    if (!beneficiary) {
      console.warn(`[${requestId}] Beneficiary with ID: ${beneficiaryId} not found.`);
      return NextResponse.json({ message: 'Beneficiary not found' }, { status: 404 });
    }
    
    // --- Step 2: Calculate Transaction Charges ---
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
    // if (user.balance < totalDebitAmount) {
    //   console.warn(`[${requestId}] Insufficient balance for UserID: ${userId}. Balance: ${user.balance}, Required: ${totalDebitAmount}`);
    //   return NextResponse.json({ message: 'Insufficient balance' }, { status: 400 });
    // }

    // --- Step 4: Call External Payout API ---
    const cleanAccountNumber = String(beneficiary.accountNumber).replace(/\D/g, '');
    const payload = {
        amount: amount.toNumber(), // Convert Decimal to number for API
        client_referenceId: requestId,
        transferMode: 'imps',
        beneDetails: {
          bankAccount: cleanAccountNumber,
          ifsc: beneficiary.ifscCode,
          name: beneficiary.accountHolderName,
          email: user.email,
          phone: user.phoneNumber,
          address1: 'Mumbai',
        },
        bankProfileId: 1,
        accountNumber: cleanAccountNumber,
        latitude: '20.1236',
        longitude: '78.1228',
        remarks: 'IMPS Payout',
    };

    console.log(`[${requestId}] Sending payload to Aeronpay:`, JSON.stringify(payload, null, 2));
    
    let response;
    let payoutResult;
    try {
        response = await fetch('https://api.aeronpay.in/api/serviceapi-prod/api/payout/imps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'client-id': process.env.AERONPAY_CLIENT_ID, 'client-secret': process.env.AERONPAY_CLIENT_SECRET },
            body: JSON.stringify(payload),
        });
        payoutResult = await response.json();
    } catch (apiError) {
        console.error(`[${requestId}] Network or fetch error calling Aeronpay API:`, apiError);
        // Record a FAILED transaction on network error
        await prisma.transactions.create({
            data: { senderId: userId, beneficiaryId, amount, chargesAmount: transactionCharge, transactionType: 'IMPS', transactionStatus: 'FAILED', websiteUrl, transactionId ,referenceNo: payoutResult?.data?.client_referenceId },
        });
        return NextResponse.json({ message: 'Failed to connect to the payment provider.' }, { status: 503 });
    }

    console.log(`[${requestId}] Aeronpay API response received. Status: ${response.status}, Body:`, payoutResult);

    // --- Step 5: Process API Response ---
    if (response.ok && payoutResult.status === 'SUCCESS' || payoutResult.status === 'PENDING') {
      // SUCCESS PATH: Record the transaction and update balance
      console.log(`[${requestId}] Aeronpay reported SUCCESS. Starting database transaction.`);
      try {
        await prisma.$transaction(async (tx) => {
          // await tx.user.update({
          //   where: { id: userId },
          //   data: { balance: { decrement: totalDebitAmount } },
          // });

          await tx.transactions.create({
            data: {
              senderId: userId,
              beneficiaryId: beneficiaryId,
              amount: amount,
              chargesAmount: transactionCharge,
              transactionType: 'IMPS',
              transactionStatus: payoutResult.status === 'SUCCESS' ? 'COMPLETED' : 'PENDING',
              senderAccount: user.email, // Or another identifier
              websiteUrl: websiteUrl,
              referenceNo: requestId,
              transaction_no: payoutResult.data?.transactionId,
              transactionId: transactionId,
              gateway: 'AeronPay'
              // Keep other fields from your model if they exist
            },
          });
        });
        console.log(`[${requestId}] Database transaction completed successfully.`);
        return NextResponse.json(payoutResult);
      } catch (txError) {
        console.error(`[${requestId}] CRITICAL: DB transaction failed after successful payout! Manual intervention required.`, txError);
        return NextResponse.json({ message: 'Payout successful, but failed to update records. Please contact support.', payoutData: payoutResult }, { status: 500 });
      }
    } else {
      // FAILURE PATH: Record the failed attempt, but DO NOT update balance
      console.warn(`[${requestId}] Aeronpay payout failed.`);
      await prisma.transactions.create({
        data: {
          senderId: userId,
          beneficiaryId: beneficiaryId,
          amount: amount,
          chargesAmount: transactionCharge,
          transactionType: 'IMPS',
          transactionStatus: 'FAILED',
          senderAccount: user.email,
          websiteUrl: websiteUrl,
          transactionId: transactionId,
        },
      });
      console.log(`[${requestId}] Logged FAILED transaction.`);

      // FIX: Extract the specific error message for the frontend toast
      const errorMessage = payoutResult.description || payoutResult.message || 'The payment was rejected by the provider.';
      
      return NextResponse.json(
        { message: errorMessage, ...payoutResult }, 
        { status: response.status >= 400 ? response.status : 400 }
      );
    }

  } catch (error) {
    console.error(`[${requestId}] --- UNHANDLED GLOBAL ERROR IN PAYOUT HANDLER ---`, error);
    // Use Decimal.isDecimal to check if it's a Prisma Decimal error
    const errorMessage = Decimal.isDecimal(error) ? 'A decimal-related processing error occurred.' : (error.message || 'An unexpected error occurred.');
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}