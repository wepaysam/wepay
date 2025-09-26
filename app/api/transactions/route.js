import { NextResponse } from 'next/server';
import { getUserTransactions, createTransactionWithCharges } from '../../controllers/transactionController';
import { authMiddleware } from '../../middleware/authMiddleware';
import prisma from '../../lib/prisma';

export async function GET(request) {
  try {
    // Use the authMiddleware to verify the token
    const authError = await authMiddleware(request);
    if (authError) return authError;
    
    // At this point, request.user contains the decoded token data
    const userId = request.user.id;

    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get('searchTerm');
    const transactionBasis = searchParams.get('transactionBasis');
    const dateFilter = searchParams.get('dateFilter');

    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    // Get the user's transactions
    const { transactions, totalTransactions } = await getUserTransactions(userId, searchTerm, transactionBasis, limit, skip, dateFilter);

    return NextResponse.json({ transactions, totalTransactions });
  } catch (error) {
    console.error('Transactions API error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { amount, type, description, beneficiaryId } = await request.json();

    const authResult = await authMiddleware(request);
    if (authResult) return authResult;
    // At this point, request.user contains the decoded token data
    const userId = request.user.id;

    const result = await prisma.transactionCharge.aggregate({
      _min: {
        minAmount: true,
      },
      _max: {
        maxAmount: true,
      },
    });
    

    if (amount < result._min.minAmount || amount > result._max.maxAmount) {
      return NextResponse.json(
        { message: `Transaction should be between ${result._min.minAmount} and ${result._max.maxAmount}` },
        { status: 400 }
      );
    }
    
    // Create transaction
    const transaction = await createTransactionWithCharges(userId, beneficiaryId, amount, type, description);

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}
