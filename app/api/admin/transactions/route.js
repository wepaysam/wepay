import { getAllTransactions } from '../../../controllers/adminController';
import { adminAuthMiddleware } from '../../../middleware/authMiddleware';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const authError = await adminAuthMiddleware(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const days = searchParams.get('days'); // Added this line
    const searchTerm = searchParams.get('searchTerm');
    const transactionType = searchParams.get('transactionType');
    const timeFilter = searchParams.get('timeFilter');
    const transactionId = searchParams.get('transactionId');
    const referenceNo = searchParams.get('referenceNo');
    const utr = searchParams.get('utr');
    const websiteUrl = searchParams.get('websiteUrl');
    const senderAccount = searchParams.get('senderAccount');
    const receiverName = searchParams.get('receiverName');
    const accountUpiId = searchParams.get('accountUpiId');

    const transactions = await getAllTransactions({
      days,
      searchTerm,
      transactionType,
      timeFilter,
      transactionId,
      referenceNo,
      utr,
      websiteUrl,
      senderAccount,
      receiverName,
      accountUpiId,
    });
    return NextResponse.json({ transactions });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 