import { NextResponse } from 'next/server';
import { verifiedUserMiddleware } from '../../middleware/authMiddleware';
import prisma from '../../lib/prisma';

export async function POST(request) {
  try {
    const authResult = await verifiedUserMiddleware(request);
    if (authResult) return authResult;

    const { amount, beneficiaryId } = await request.json();
    const userId = request.user.id;

    // Get beneficiary details
    const beneficiary = await prisma.beneficiary.findUnique({
      where: { id: beneficiaryId },
    });

    if (!beneficiary) {
      return NextResponse.json({ message: 'Beneficiary not found' }, { status: 404 });
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    if (user.balance < amount) {
      return NextResponse.json({ message: 'Insufficient balance' }, { status: 400 });
    }

    const response = await fetch('https://api.aeronpay.in/api/serviceapi-prod/api/payout/imps', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'client-id': process.env.AERONPAY_CLIENT_ID,
        'client-secret': process.env.AERONPAY_CLIENT_SECRET,
      },
      body: JSON.stringify({
        amount: amount,
        client_referenceId: `TXN_${Date.now()}`,
        transferMode: 'imps',
        beneDetails: {
          bankAccount: beneficiary.accountNumber,
          ifsc: beneficiary.ifscCode,
          name: beneficiary.accountHolderName,
          email: user.email,
          phone: user.phoneNumber,
          address1: 'Mumbai', // This should be collected from the user
        },
        bankProfileId: '1', // This might need to be dynamic
        accountNumber: beneficiary.accountNumber,
        latitude: '20.1236',
        longitude: '78.1228',
        remarks: 'imps',
      }),
    });

    const payoutResult = await response.json();

    if (response.ok && payoutResult.status === 'SUCCESS') {
      // Use a transaction to update the user's balance and create a transaction record
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
            chargesAmount: 0, // You might want to calculate this
            transactionType: 'IMPS',
            transactionStatus: 'COMPLETED',
            senderAccount: beneficiary.accountNumber, // This should be the user's account number
          },
        });
      });

      return NextResponse.json(payoutResult);
    } else {
      return NextResponse.json(payoutResult, { status: response.status });
    }
  } catch (error) {
    return NextResponse.json({ message: error.message || 'Failed to process payout' }, { status: 500 });
  }
}
