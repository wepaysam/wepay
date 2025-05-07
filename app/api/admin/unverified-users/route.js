import { NextResponse } from 'next/server';

import { getUnverifiedUsers } from '../../../controllers/adminController';
import { adminAuthMiddleware } from '../../../middleware/authMiddleware';


export async function GET(request) {
  try {
    // Check if user is admin
    const authError = await adminAuthMiddleware(request);
    if (authError) return authError;

    const userId = request.user.id;
     console.log('Unverified users API: Processing request for user', userId);

    
    const users = await getUnverifiedUsers();
      console.log('Unverified users:', users);
    
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json(
      { message: error.message || 'Failed to get unverified users' },
      { status: 500 }
    );
  }
}

