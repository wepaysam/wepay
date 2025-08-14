import { NextResponse } from 'next/server';
import { getUserBalanceRequests } from '../../controllers/balanceRequestController';
import { authMiddleware } from '../../middleware/authMiddleware';

export async function GET(request) {
  try {
    const authError = await authMiddleware(request);
    if (authError) return authError;

    const userId = request.user.id;

    const balanceRequests = await getUserBalanceRequests(userId);

    return NextResponse.json(balanceRequests);
  } catch (error) {
    console.error('Balance requests API error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch balance requests' },
      { status: 500 }
    );
  }
}
