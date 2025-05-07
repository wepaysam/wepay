import { NextResponse } from 'next/server';
import { adminAuthMiddleware } from '../../../../../middleware/authMiddleware';
import { approveBalanceRequest } from '../../../../../controllers/adminController';



export async function PUT(request, { params }) {
  try {
    const { requestId } = params;
    
    // Check if user is admin
    const authError = await adminAuthMiddleware(request);
    if (authError) return authError;
    
    // Approve the balance request
    const updatedRequest = await approveBalanceRequest(requestId);
    
    return NextResponse.json({ 
      message: 'Balance request approved successfully',
      request: updatedRequest
    });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || 'Failed to approve balance request' },
      { status: 500 }
    );
  }
}


