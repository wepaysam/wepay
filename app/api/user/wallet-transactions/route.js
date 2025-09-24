import { NextResponse } from 'next/server';
import { verifiedUserMiddleware } from '../../../middleware/authMiddleware';
import prisma from '../../../lib/prisma';

export async function GET(request) {
  try {
    const authResult = await verifiedUserMiddleware(request);
    if (authResult) return authResult;
    
    const userId = request.user.id;

    // Fetch balance requests
    const balanceRequests = await prisma.balanceRequest.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' }
    });

    // Fetch balance adjustments
    const balanceAdjustments = await prisma.balanceAdjustment.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' }
    });

    // Format balance requests
    const formattedBalanceRequests = balanceRequests.map(request => ({
      id: `br_${request.id}`,
      type: 'BALANCE_REQUEST',
      displayAmount: request.amount,
      description: `Balance Request - ${request.description || 'Wallet top-up request'}`,
      createdAt: request.createdAt,
      status: request.status,
      UTRnumber: request.UTRnumber,
      transactionType: 'CREDIT',
      previousBalance: request.previousBalance,
      closingBalance: request.closingBalance
    }));

    // Format balance adjustments
    const formattedBalanceAdjustments = balanceAdjustments.map(adjustment => ({
      id: `ba_${adjustment.id}`,
      type: 'BALANCE_ADJUSTMENT',
      displayAmount: Math.abs(adjustment.amount),
      description: `Balance ${adjustment.type.toLowerCase()} - ${adjustment.reason || 'Admin adjustment'}`,
      createdAt: adjustment.createdAt,
      status: adjustment.type, // This will be 'ADDITION' or 'DEDUCTION'
      previousBalance: adjustment.previousBalance,
      closingBalance: adjustment.closingBalance,
      transactionType: adjustment.type === 'ADDITION' ? 'CREDIT' : 'DEBIT'
    }));

    // Combine all records and sort by createdAt
    const allWalletTransactions = [
      ...formattedBalanceRequests,
      ...formattedBalanceAdjustments,
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(allWalletTransactions);
  } catch (error) {
    console.error("Error fetching wallet transactions:", error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch wallet transactions' },
      { status: 500 }
    );
  }
}