import { NextResponse } from 'next/server';
import { updatePermissions } from '../../../../controllers/adminController';
import { adminAuthMiddleware } from '../../../../middleware/authMiddleware';

export async function PUT(request, { params }) {
  try {
    const authError = await adminAuthMiddleware(request);
    if (authError) return authError;
    const userId = request.user.id;
    // const { userId } = params;
    const { permissions } = await request.json();

    const updatedUser = await updatePermissions(userId, permissions);

    return NextResponse.json({
      message: 'User permissions updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || 'Failed to update user permissions' },
      { status: 500 }
    );
  }
}