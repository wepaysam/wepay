import { NextResponse } from 'next/server';
import { updateUserType } from '../../../controllers/userController';
import { adminAuthMiddleware } from '../../../middleware/authMiddleware';

export async function PUT(request) {
  try {
    // Check admin authentication
    const authResult = await adminAuthMiddleware(request);
    if (authResult) return authResult;
    
    const data = await request.json();
    
    // Validate required fields
    if (!data.userId || !data.userType) {
      return NextResponse.json(
        { message: 'User ID and user type are required' },
        { status: 400 }
      );
    }
    
    const updatedUser = await updateUserType(data.userId, data.userType);
    
    return NextResponse.json(updatedUser);
  } catch (error) {
    return NextResponse.json(
      { message: error.message || 'Failed to update user type' },
      { status: 400 }
    );
  }
}
