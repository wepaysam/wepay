import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { authMiddleware } from '../../../middleware/authMiddleware';

export async function GET(request) {
  try {
    // Use the authMiddleware to verify the token
    const authError = await authMiddleware(request);
    if (authError) return authError;
    
    // At this point, request.user contains the decoded token data
    const userId = request.user.id;
    
    // Get the user from the database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phoneNumber: true,
        email: true,
        userType: true,
        isKycVerified: true
      }
    });
    
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { message: error.message || 'Authentication failed' },
      { status: 401 }
    );
  }
}
