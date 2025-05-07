import { NextResponse } from 'next/server';
import { getUserProfile } from '../../../controllers/userController';
import { authMiddleware } from '../../../middleware/authMiddleware';

export async function GET(request) {
  try {
    // Check authentication
    const authResult = await authMiddleware(request);
    if (authResult) return authResult;
    
    const userId = request.user.id;
    const profile = await getUserProfile(userId);
    
    return NextResponse.json(profile);
  } catch (error) {
    return NextResponse.json(
      { message: error.message || 'Failed to get profile' },
      { status: 400 }
    );
  }
}
