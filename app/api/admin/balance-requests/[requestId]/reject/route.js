import { NextResponse } from 'next/server';
import { adminAuthMiddleware } from '../../../../../middleware/authMiddleware';
import { rejectBalanceRequest } from '../../../../../controllers/adminController';

export async function PUT(request, { params }) {
  try {
    const { requestId } = params;
    
    // Check if user is admin
    const authError = await adminAuthMiddleware(request);
    if (authError) return authError;
    
    // Reject the balance request
    const updatedRequest = await rejectBalanceRequest(requestId);
    
    return NextResponse.json({ 
      message: 'Balance request rejected',
      request: updatedRequest
    });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || 'Failed to reject balance request' },
      { status: 500 }
    );
  }
}
