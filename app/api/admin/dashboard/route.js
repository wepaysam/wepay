import { NextResponse } from 'next/server';
import { getDashboardStats } from '../../../controllers/adminController';
import { adminAuthMiddleware } from '../../../middleware/authMiddleware';

export async function GET(request) {
  try {
    // Check if user is admin
    const authError = await adminAuthMiddleware(request);
    if (authError) return authError;

     // At this point, request.user contains the decoded token data
     const userId = request.user.id;
     console.log('Dashboard API: Processing request for user', userId);

    //  if(!user)
    
    // Get dashboard stats
    const stats = await getDashboardStats();
    
    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json(
      { message: error.message || 'Failed to get dashboard stats' },
      { status: 500 }
    );
  }
}
