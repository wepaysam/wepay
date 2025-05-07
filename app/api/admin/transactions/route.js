import { getAllTransactions } from '../../../controllers/adminController';
import { adminAuthMiddleware } from '../../../middleware/authMiddleware';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    console.log("Getting all transactions");
    const authError = await adminAuthMiddleware(request);
    if (authError) return authError;
    console.log("Getting all transactions:2");
    const transactions = await getAllTransactions();
    console.log("Getting all transactions:3");
    return NextResponse.json(transactions);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 