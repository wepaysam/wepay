import { NextResponse } from 'next/server';
import { adminAuthMiddleware } from '../../../middleware/authMiddleware';

import { getBalanceRequests } from '../../../controllers/adminController';


export async function GET(request) {
  try {
    // Check if user is admin
    const authError = await adminAuthMiddleware(request);
    if (authError) return authError;
    
    const userId = request.user.id;
    console.log('Balance requests API: Processing request for user', userId);

    
    // Get balance requests
    const requests = await getBalanceRequests();
    
    return NextResponse.json(requests);
  } catch (error) {
    return NextResponse.json(
      { message: error.message || 'Failed to get balance requests' },
      { status: 500 }
    );
  }
}
