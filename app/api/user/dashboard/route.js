import { NextResponse } from 'next/server';
import { getUserProfile } from '../../../controllers/userController';
import { getUserTransactions } from '../../../controllers/transactionController';
import prisma from '../../../lib/prisma';
import { authMiddleware } from '../../../middleware/authMiddleware';

export async function GET(request) {
  try {
    // Use the authMiddleware to verify the token
    const authError = await authMiddleware(request);
    if (authError) return authError;
    
    // At this point, request.user contains the decoded token data
    const userId = request.user.id;
    console.log('Dashboard API: Processing request for user', userId);

    // Get user profile
    let user;
    try {
      user = await getUserProfile(userId);
      if (!user) {
        console.error('Dashboard API: User not found', userId);
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
      }
    } catch (profileError) {
      console.error('Dashboard API: Error getting user profile', profileError);
      return NextResponse.json(
        { message: `Error fetching user profile: ${profileError.message}` },
        { status: 500 }
      );
    }
    
    // Get recent transactions
    let transactions = [];
    try {
      transactions = await getUserTransactions(userId) || [];
      console.log(`Dashboard API: Found ${transactions} transactions`);
    } catch (txnError) {
      console.error('Dashboard API: Error getting transactions', txnError);
      // Continue with empty transactions array rather than failing completely
    }
    
    // Get beneficiary count
    let beneficiaryCount = 0;
    try {
      beneficiaryCount = await prisma.beneficiary.count({
        where: { userId: userId }
      });
    } catch (benefError) {
      console.error('Dashboard API: Error counting beneficiaries', benefError);
      // Continue with zero rather than failing completely
    }

    // Get transaction stats
    const transactionCount = transactions.length;
    
    // Calculate monthly transfer (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentTransactions = transactions.filter(
      txn => new Date(txn.transactionTime) >= thirtyDaysAgo
    );
    
    let monthlyTransferTotal = 0;
    recentTransactions.forEach(txn => {
      if (txn.amount) {
        monthlyTransferTotal += parseFloat(txn.amount);
      }
    });

    // Format transactions for the frontend - handle potential null values
    const formattedTransactions = transactions.slice(0, 5).map(txn => {
      return {
        txnId: txn.id || 'Unknown',
        chargesAmount: txn.chargesAmount ? parseFloat(txn.chargesAmount).toFixed(2) : '0.00',
        receiverName: txn.beneficiary?.accountHolderName || 'Unknown',
        amount: txn.amount ? parseFloat(txn.amount).toFixed(2) : '0.00',
        totalAmount: (txn.amount && txn.chargesAmount) 
          ? (parseFloat(txn.amount) + parseFloat(txn.chargesAmount)).toFixed(2) 
          : '0.00',
        status: txn.transactionStatus || 'UNKNOWN',
        date: txn.transactionTime ? new Date(txn.transactionTime).toLocaleDateString('en-IN') : 'Unknown',
        time: txn.transactionTime ? new Date(txn.transactionTime).toLocaleTimeString('en-IN', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }) : ''
      };
    });

    // Ensure balance is a valid number
    const userBalance = user.balance ? parseFloat(user.balance).toFixed(2) : '0.00';

    const responseData = {
      user: {
        balance: userBalance,
        phoneNumber: user.phoneNumber || '',
        email: user.email || ''
      },
      stats: {
        transactionCount,
        beneficiaryCount,
        monthlyTransfer: monthlyTransferTotal.toFixed(2)
      },
      transactions: formattedTransactions
    };

    console.log('Dashboard API: Sending successful response');
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Dashboard API general error:', error);
    return NextResponse.json(
      { message: `Error fetching dashboard data: ${error.message}` },
      { status: 500 }
    );
  }
}
