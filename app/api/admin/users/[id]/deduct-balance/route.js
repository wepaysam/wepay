import { NextResponse } from 'next/server';
import { adminAuthMiddleware } from '../../../../../middleware/authMiddleware';
import { deductUserBalance } from '../../../../../controllers/adminController';

export async function PUT(request, { params }) {
  try {
    const { userId } = params;
    const { amount, reason } = await request.json();

    // Check if user is admin
    const authError = await adminAuthMiddleware(request);
    if (authError) return authError;
    
    const adminId = request.user.id; // Get admin ID from authenticated user

    if (!amount || amount <= 0) {
      return NextResponse.json({ message: 'Amount must be a positive number' }, { status: 400 });
    }
    if (!reason || reason.trim() === '') {
      return NextResponse.json({ message: 'Reason for deduction is required' }, { status: 400 });
    }

    const updatedUser = await deductUserBalance(userId, adminId, parseFloat(amount), reason);

    return NextResponse.json({
      message: 'Balance deducted successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error deducting balance:", error);
    return NextResponse.json(
      { message: error.message || 'Failed to deduct balance' },
      { status: 500 }
    );
  }
}
