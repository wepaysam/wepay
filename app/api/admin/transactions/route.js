import { getAllTransactions } from '../../../controllers/adminController';
import { adminAuthMiddleware } from '../../../middleware/authMiddleware';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const authError = await adminAuthMiddleware(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const days = searchParams.get('days');

    const transactions = await getAllTransactions({ days });
    return NextResponse.json({ transactions });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 