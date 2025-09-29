import { NextResponse } from 'next/server';
import { verifiedUserMiddleware } from '../../middleware/authMiddleware';
import prisma from '../../lib/prisma';
import crypto from 'crypto';
import { Decimal } from '@prisma/client/runtime/library'; // Import Decimal for calculations

export async function POST(request) {
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
  console.log(`[${requestId}] Payout request received.`);

  try {
    const authResult = await verifiedUserMiddleware(request);
    if (authResult) {
      console.warn(`[${requestId}] Authentication failed.`);
      return authResult;
    }

    const { amount: rawAmount, beneficiaryId, websiteUrl } = await request.json();
    const userId = request.user?.id; // Get userId from req.user

    const [user, beneficiary, userCharges] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { impsPermissions: true, isDisabled: true, email: true, phoneNumber: true, balance: true } }),
      prisma.beneficiary.findUnique({ where: { id: beneficiaryId } }),
      prisma.userTransactionCharge.findMany({ where: { userId: userId, type: 'IMPS' } })
    ]);

    if (!user) {
      console.error(`[${requestId}] CRITICAL: Authenticated UserID: ${userId} not found.`);
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    if (user.isDisabled) {
      return NextResponse.json({ message: 'You are not allowed to use this service right now.' }, { status: 403 });
    }

    const lastTransaction = await prisma.transactions.findFirst({
        where: { senderId: userId },
        orderBy: { createdAt: 'desc' },
    });

    if (lastTransaction) {
        const now = new Date();
        const lastTransactionTime = new Date(lastTransaction.createdAt);
        const timeDifference = (now.getTime() - lastTransactionTime.getTime()) / 1000;

        if (timeDifference < 10) {
            return NextResponse.json({ message: 'Please try again after 1 minute.' }, { status: 429 });
        }
    }

    const existingWebsiteUrlTransaction = await prisma.transactions.findFirst({
        where: {
            websiteUrl: websiteUrl,
        },
    });

    if (existingWebsiteUrlTransaction) {
        return NextResponse.json({ message: 'A transaction with this website URL already exists.' }, { status: 400 });
    }

    if (!user || !user.impsPermissions?.enabled || !user.impsPermissions?.aeronpay) {
        console.warn(`User ${userId || 'Unknown'} does not have DMT permission.`);
        return NextResponse.json({ message: 'You do not have permission to perform DMT transactions.' }, { status: 403 });
    }

    const amount = new Decimal(rawAmount);

    if (amount.isNaN() || amount.isNegative() || amount.isZero()) {
        console.warn(`[${requestId}] Invalid request body. Amount is invalid.`);
        return NextResponse.json({ message: 'A valid Amount is required.' }, { status: 400 });
    }

    if(user.balance.lessThan(amount)){
      return NextResponse.json({ message: 'Insufficient Balance' }, { status: 403 });
    }

    console.log(`[${requestId}] Processing payout. UserID: ${userId}, BeneficiaryID: ${beneficiaryId}, Amount: ${amount}`);

    if (!beneficiaryId) {
        console.warn(`[${requestId}] Invalid request body. BeneficiaryId invalid.`);
        return NextResponse.json({ message: 'A valid BeneficiaryId is required.' }, { status: 400 });
    }

    if (!beneficiary) {
      console.warn(`[${requestId}] Beneficiary with ID: ${beneficiaryId} not found.`);
      return NextResponse.json({ message: 'Beneficiary not found' }, { status: 404 });
    }
    
    let chargeRule;
    let isUserCharge = false;
    if (userCharges.length > 0) {
        chargeRule = userCharges.find(charge => new Decimal(charge.minAmount).lessThanOrEqualTo(amount) && new Decimal(charge.maxAmount).greaterThanOrEqualTo(amount));
        if(chargeRule) isUserCharge = true;
    } 
    if(!chargeRule) {
        chargeRule = await prisma.transactionCharge.findFirst({
            where: {
                type: 'IMPS',
                minAmount: { lte: amount },
                maxAmount: { gte: amount },
            },
        });
    }

    const chargePercentage = chargeRule ? new Decimal(chargeRule.charge) : new Decimal(0);
    const transactionCharge = isUserCharge ? amount.mul(chargePercentage).div(100) : chargePercentage;
    const totalDebitAmount = amount.add(transactionCharge);
    console.log(`[${requestId}] Amount: ${amount}, Charge: ${transactionCharge}, Total Debit: ${totalDebitAmount}`);

    let transactionRecord;
    try {
      await prisma.$transaction(async (tx) => {
        const currentUser = await tx.user.findUnique({ where: { id: userId }, select: { balance: true } });
        if (!currentUser || currentUser.balance.lessThan(totalDebitAmount)) {
          throw new Error('Insufficient balance');
        }

        const previousBalance = currentUser.balance;
        const closingBalance = previousBalance.minus(totalDebitAmount);

        await tx.user.update({
          where: { id: userId },
          data: { balance: closingBalance },
        });

        transactionRecord = await tx.transactions.create({
          data: {
            sender:{ connect: { id: userId } },
            beneficiary:{ connect: { id: beneficiary.id } },
            amount: amount,
            chargesAmount: transactionCharge,
            transactionType: 'IMPS',
            transactionStatus: 'PENDING',
            senderAccount: user.email,
            websiteUrl: websiteUrl,
            referenceNo: requestId,
            transactionId: transactionId,
            gateway: 'AeronPay',
            previousBalance: previousBalance,
            closingBalance: closingBalance,
          },
        });

        await tx.userCharge.create({
            data: {
                amount: transactionCharge,
                description: 'IMPS Transaction Charge',
                transactionId: transactionRecord.id,
                userId: userId,
                type: 'DEDUCTED'
            }
        });
      });
      console.log(`[${requestId}] Funds reserved and pending transaction ${transactionRecord.id} created.`);
    } catch (dbError) {
      console.error(`[${requestId}] Failed to reserve funds or create pending transaction:`, dbError);
      return NextResponse.json({ message: dbError.message || 'Failed to process payment due to a database error.' }, { status: 400 });
    }

    const cleanAccountNumber = String(beneficiary.accountNumber).replace(/\D/g, '');
    const payload = {
        amount: amount.toNumber(),
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
        try {
          await prisma.$transaction(async (tx) => {
            const userToRevert = await tx.user.findUnique({ where: { id: userId } });
            const newBalance = new Decimal(userToRevert.balance).add(totalDebitAmount);

            await tx.user.update({
              where: { id: userId },
              data: { balance: newBalance },
            });
            await tx.transactions.update({
              where: { id: transactionRecord.id },
              data: { 
                transactionStatus: 'FAILED',
                previousBalance: newBalance, // Balance after reversal
                closingBalance: newBalance,  // Balance after reversal
              },
            });
            await tx.userCharge.create({
                data: {
                    amount: transactionCharge,
                    description: 'IMPS Transaction Charge Reversal',
                    transactionId: transactionRecord.id,
                    userId: userId,
                    type: 'REVERTED'
                }
            });
          });
          console.log(`[${requestId}] Funds reverted and transaction ${transactionRecord.id} marked FAILED due to API error.`);
        } catch (revertError) {
          console.error(`[${requestId}] CRITICAL: Failed to revert funds after API error! Manual intervention required for transaction ${transactionRecord.id}.`, revertError);
        }
        return NextResponse.json({ message: 'Failed to connect to the payment provider.' }, { status: 503 });
    }

    console.log(`[${requestId}] Aeronpay API response received. Status: ${response.status}, Body:`, payoutResult);

    if (response.ok && (payoutResult.status === 'SUCCESS' || payoutResult.status === 'PENDING')) {
      console.log(`[${requestId}] Aeronpay reported SUCCESS/PENDING. Finalizing transaction.`);
      try {
        await prisma.transactions.update({
          where: { id: transactionRecord.id },
          data: {
            transactionStatus: payoutResult.status === 'SUCCESS' ? 'COMPLETED' : 'PENDING',
            transaction_no: payoutResult.data?.transactionId,
          },
        });
        console.log(`[${requestId}] Transaction ${transactionRecord.id} finalized successfully.`);
        return NextResponse.json(payoutResult);
      } catch (txError) {
        console.error(`[${requestId}] CRITICAL: Failed to finalize transaction ${transactionRecord.id} after successful payout! Manual intervention required.`, txError);
        return NextResponse.json({ message: 'Payout successful, but failed to update records. Please contact support.', payoutData: payoutResult }, { status: 500 });
      }
    } else {
      console.warn(`[${requestId}] Aeronpay payout failed. Reverting funds.`);
      try {
        await prisma.$transaction(async (tx) => {
            const userToRevert = await tx.user.findUnique({ where: { id: userId } });
            const newBalance = new Decimal(userToRevert.balance).add(totalDebitAmount);

          await tx.user.update({
            where: { id: userId },
            data: { balance: newBalance },
          });
          await tx.transactions.update({
            where: { id: transactionRecord.id },
            data: {
              transactionStatus: 'FAILED',
              previousBalance: newBalance, // Balance after reversal
              closingBalance: newBalance,  // Balance after reversal
            },
          });
          await tx.userCharge.create({
            data: {
                amount: transactionCharge,
                description: 'IMPS Transaction Charge Reversal',
                transactionId: transactionRecord.id,
                userId: userId,
                type: 'REVERTED'
            }
        });
        });
        console.log(`[${requestId}] Funds reverted and transaction ${transactionRecord.id} marked FAILED due to Aeronpay failure.`);
      } catch (revertError) {
        console.error(`[${requestId}] CRITICAL: Failed to revert funds after Aeronpay failure! Manual intervention required for transaction ${transactionRecord.id}.`, revertError);
      }

      const errorMessage = payoutResult.description || payoutResult.message || 'The payment was rejected by the provider.';
      
      return NextResponse.json(
        { message: errorMessage, ...payoutResult }, 
        { status: response.status >= 400 ? response.status : 400 }
      );
    }

  } catch (error) {
    console.error(`[${requestId}] --- UNHANDLED GLOBAL ERROR IN PAYOUT HANDLER ---`, error);
    const errorMessage = Decimal.isDecimal(error) ? 'A decimal-related processing error occurred.' : (error.message || 'An unexpected error occurred.');
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
