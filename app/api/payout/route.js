import { NextResponse } from 'next/server';
import { verifiedUserMiddleware } from '../../middleware/authMiddleware';
import prisma from '../../lib/prisma';

export async function POST(request) {
  // Use a unique identifier for the request for easier log tracing
  const requestId = `payout-${Date.now()}`;
  console.log(`[${requestId}] Payout request received.`);

  try {
    const authResult = await verifiedUserMiddleware(request);
    if (authResult) {
      console.warn(`[${requestId}] Authentication failed.`);
      return authResult;
    }

    const { amount, beneficiaryId } = await request.json();
    const userId = request.user.id;
    
    // Log the initial request details
    console.log(`[${requestId}] Processing payout. UserID: ${userId}, BeneficiaryID: ${beneficiaryId}, Amount: ${amount}`);

    if (!amount || !beneficiaryId) {
        console.warn(`[${requestId}] Invalid request body. Amount or BeneficiaryId missing.`);
        return NextResponse.json({ message: 'Amount and BeneficiaryId are required.' }, { status: 400 });
    }

    // --- Step 1: Fetch Beneficiary and User details ---
    let beneficiary, user;
    try {
      beneficiary = await prisma.beneficiary.findUnique({ where: { id: beneficiaryId } });
      if (!beneficiary) {
        console.warn(`[${requestId}] Beneficiary with ID: ${beneficiaryId} not found for UserID: ${userId}.`);
        return NextResponse.json({ message: 'Beneficiary not found' }, { status: 404 });
      }

      user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        console.error(`[${requestId}] CRITICAL: Authenticated UserID: ${userId} not found in database.`);
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
      }
    } catch (dbError) {
      console.error(`[${requestId}] Prisma Error fetching user/beneficiary details:`, dbError);
      return NextResponse.json({ message: 'Database error while fetching details.' }, { status: 500 });
    }
    
    console.log(`[${requestId}] Successfully fetched details for User: ${user.email} and Beneficiary: ${beneficiary.accountHolderName}`);

    // --- Step 2: Validate User Balance ---
    if (user.balance < amount) {
      console.warn(`[${requestId}] Insufficient balance for UserID: ${userId}. Balance: ${user.balance}, Required: ${amount}`);
      return NextResponse.json({ message: 'Insufficient balance' }, { status: 400 });
    }

    // --- Step 3: Call External Payout API ---
    let payoutResult;
    try {
      console.log(`[${requestId}] Preparing payload for Aeronpay.`);
      
      const payload = {
        amount: amount,
        client_referenceId: `TXN_${requestId}`,
        transferMode: 'imps',
        beneDetails: {
          // FIX: Ensure account number is a string as required.
          bankAccount: String(beneficiary.accountNumber),
          ifsc: beneficiary.ifscCode,
          // FIX: Changed back to 'accountHolderName'. Double-check your Prisma model for this field name.
          name: beneficiary.accountHolderName,
          email: user.email,
          phone: user.phoneNumber,
          address1: 'Mumbai', // This should be collected from the user eventually
        },
        // FIX: API expects a numeric value, not a string.
        bankProfileId: 1, 
        latitude: '20.1236',
        longitude: '78.1228',
        remarks: 'IMPS Payout',
        // FIX: Removed redundant root-level `accountNumber` which caused validation errors.
      };

      console.log(`[${requestId}] Sending payload to Aeronpay:`, JSON.stringify(payload, null, 2));

      const response = await fetch('https://api.aeronpay.in/api/serviceapi-prod/api/payout/imps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'client-id': process.env.AERONPAY_CLIENT_ID,
          'client-secret': process.env.AERONPAY_CLIENT_SECRET,
        },
        body: JSON.stringify(payload),
      });

      payoutResult = await response.json();
      console.log(`[${requestId}] Aeronpay API response received. Status: ${response.status}, Body:`, payoutResult);

      if (!response.ok || payoutResult.status !== 'SUCCESS') {
        console.warn(`[${requestId}] Aeronpay payout failed or returned non-success status.`);
        return NextResponse.json(payoutResult, { status: response.status >= 400 ? response.status : 400 });
      }

    } catch (apiError) {
      console.error(`[${requestId}] Network or fetch error calling Aeronpay API:`, apiError);
      return NextResponse.json({ message: 'Failed to connect to payout service.' }, { status: 503 });
    }

    // --- Step 4: Process Successful Payout (Database Transaction) ---
    try {
      console.log(`[${requestId}] Aeronpay reported SUCCESS. Starting database transaction.`);
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { balance: { decrement: amount } },
        });

        await tx.transactions.create({
          data: {
            senderId: userId,
            beneficiaryId: beneficiaryId,
            amount: amount,
            chargesAmount: 0, 
            transactionType: 'IMPS_PAYOUT',
            transactionStatus: 'COMPLETED',
            referenceId: payoutResult.referenceId || `TXN_${requestId}`, 
            senderAccount: user.email,
            receiverAccount: beneficiary.accountNumber,
          },
        });
      });
      console.log(`[${requestId}] Database transaction completed successfully.`);
      return NextResponse.json(payoutResult);

    } catch (txError) {
      console.error(`[${requestId}] CRITICAL: DB transaction failed after successful payout from Aeronpay! Manual intervention required.`, txError);
      return NextResponse.json({ 
        message: 'Payout successful, but failed to update records. Please contact support.',
        payoutData: payoutResult 
      }, { status: 500 });
    }

  } catch (error) {
    console.error(`[${requestId}] --- UNHANDLED GLOBAL ERROR IN PAYOUT HANDLER ---`, error);
    return NextResponse.json({ message: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}