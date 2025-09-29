import { NextResponse } from 'next/server';
import { verifiedUserMiddleware } from '../../../middleware/authMiddleware';
import prisma from '../../../lib/prisma';

export async function GET(request) {
  try {
    const authResult = await verifiedUserMiddleware(request);
    if (authResult) return authResult;
    
    const userId = request.user.id;

    // 1. Fetch all raw data
    const balanceRequests = await prisma.balanceRequest.findMany({ where: { userId } });
    const balanceAdjustments = await prisma.balanceAdjustment.findMany({ where: { userId } });
    const transactions = await prisma.transactions.findMany({
      where: { senderId: userId, transactionStatus: 'COMPLETED' },
      include: { beneficiary: true, upiBeneficiary: true, dmtBeneficiary: true },
    });

    // 2. Unify and format data into a single chronological list
    let combinedEvents = [];

    balanceRequests.forEach(req => {
      if (req.status === 'APPROVED') {
        combinedEvents.push({
          timestamp: new Date(req.createdAt),
          type: 'BALANCE_REQUEST',
          amount: parseFloat(req.amount),
          data: req,
        });
      }
    });

    balanceAdjustments.forEach(adj => {
      combinedEvents.push({
        timestamp: new Date(adj.createdAt),
        type: 'BALANCE_ADJUSTMENT',
        amount: parseFloat(adj.amount), // Amount is already signed (+/-)
        data: adj,
      });
    });

    transactions.forEach(tx => {
      const totalDeduction = (parseFloat(tx.amount) || 0) + (parseFloat(tx.chargesAmount) || 0);
      combinedEvents.push({
        timestamp: new Date(tx.createdAt),
        type: 'PAYOUT_DEDUCTION',
        amount: -totalDeduction, // Negative amount for deduction
        data: tx,
      });
    });

    // 3. Sort all events chronologically (oldest first)
    combinedEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // 4. Calculate running balance
    const user = await prisma.user.findUnique({ where: { id: userId } });
    let currentBalance = parseFloat(user.balance);

    // To calculate the starting balance, we sum up all amounts in reverse
    let startingBalance = currentBalance;
    for (let i = combinedEvents.length - 1; i >= 0; i--) {
      startingBalance -= combinedEvents[i].amount;
    }

    let runningBalance = startingBalance;
    const finalWalletTransactions = combinedEvents.map(event => {
      const previousBalance = runningBalance;
      runningBalance += event.amount;
      const closingBalance = runningBalance;

      // Format the event data for the frontend
      let formattedEvent;
      switch (event.type) {
        case 'BALANCE_REQUEST':
          formattedEvent = {
            id: `br_${event.data.id}`,
            type: 'BALANCE_REQUEST',
            displayAmount: event.data.amount,
            description: `Balance Request - ${event.data.description || 'Wallet top-up'}`,
            createdAt: event.data.createdAt,
            status: event.data.status,
            UTRnumber: event.data.UTRnumber,
            transactionType: 'CREDIT',
            previousBalance,
            closingBalance,
          };
          break;
        case 'BALANCE_ADJUSTMENT':
          formattedEvent = {
            id: `ba_${event.data.id}`,
            type: 'BALANCE_ADJUSTMENT',
            displayAmount: Math.abs(event.data.amount),
            description: `Balance ${event.data.type.toLowerCase()} - ${event.data.reason || 'Admin adjustment'}`,
            createdAt: event.data.createdAt,
            status: event.data.type,
            transactionType: event.data.amount > 0 ? 'CREDIT' : 'DEBIT',
            previousBalance,
            closingBalance,
          };
          break;
        case 'PAYOUT_DEDUCTION':
          const beneficiaryName = event.data.beneficiary?.accountHolderName || event.data.upiBeneficiary?.accountHolderName || event.data.dmtBeneficiary?.accountHolderName || 'N/A';
          formattedEvent = {
            id: `tx_${event.data.id}`,
            type: 'PAYOUT_DEDUCTION',
            displayAmount: -event.amount, // Show positive number for deduction amount
            description: `Payout to ${beneficiaryName}`,
            createdAt: event.data.createdAt,
            status: 'DEDUCTION',
            transactionType: 'DEBIT',
            previousBalance,
            closingBalance,
          };
          break;
      }
      return formattedEvent;
    });

    // 5. Sort by date descending for display
    finalWalletTransactions.reverse();

    return NextResponse.json(finalWalletTransactions);
  } catch (error) {
    console.error("Error fetching wallet transactions:", error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch wallet transactions' },
      { status: 500 }
    );
  }
}