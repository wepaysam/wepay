
import { NextResponse } from 'next/server';
import { verifiedUserMiddleware } from '../../../middleware/authMiddleware';
import prisma from '../../../lib/prisma';

export async function POST(request: Request) {
  try {
    const authResult = await verifiedUserMiddleware(request);
    if (authResult) {
      return authResult;
    }

    const { cardNumber, cardHolderName, amount } = await request.json();

    // In a real application, you would use the Aeronpay API here
    // For now, we'll just record the transaction in our database

    const transaction = await prisma.transaction.create({
      data: {
        amount,
        chargesAmount: 0, // Assuming no charges for now
        transactionType: 'CREDIT_CARD_PAYMENT',
        transactionStatus: 'COMPLETED',
        beneficiaryName: cardHolderName,
        beneficiaryIdentifier: cardNumber
      },
    });

    return NextResponse.json({ status: 'success', transaction });
  } catch (error) {
    console.error('Error processing credit card payment:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
