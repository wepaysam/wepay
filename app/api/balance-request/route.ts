import { NextResponse } from 'next/server';
import { verifiedUserMiddleware } from '../../../app/middleware/authMiddleware';
import { createBalanceRequest, getUserBalanceRequests } from '../../../controllers/balanceRequestController';

// Update Prisma schema to include proofFilePath field
// This route handles file uploads for balance requests

export async function POST(request) {
  try {
    // Log headers for debugging
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    
    // Check authentication
    const authResult = await verifiedUserMiddleware(request);
    if (authResult) {
      console.log('Authentication failed:', authResult.status);
      return authResult;
    }
    
    const userId = request.user.id;
    console.log('Authenticated user ID:', userId);
    
    // Parse JSON body
    const data = await request.json();
    const { amount, UTRnumber } = data;
    
    // Validate required fields
    if (!amount || !UTRnumber) {
      return NextResponse.json(
        { message: 'Amount and UTR number are required' },
        { status: 400 }
      );
    }
    
    // Validate amount is a number
    if (isNaN(parseFloat(amount))) {
      return NextResponse.json(
        { message: 'Amount must be a valid number' },
        { status: 400 }
      );
    }
    
    // Create balance request
    const balanceRequest = await createBalanceRequest(data, userId);
    
    return NextResponse.json(
      { 
        message: 'Balance request submitted successfully',
        balanceRequest 
      }, 
      { status: 201 }
    );
  } catch (error) {
    console.error('Balance request error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to submit balance request' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    // Check authentication
    const authResult = await verifiedUserMiddleware(request);
    if (authResult) return authResult;
    
    const userId = request.user.id;
    
    // Get user's balance requests
    const balanceRequests = await getUserBalanceRequests(userId);
    
    return NextResponse.json({ balanceRequests });
  } catch (error) {
    console.error('Get balance requests error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch balance requests' },
      { status: 500 }
    );
  }
}
