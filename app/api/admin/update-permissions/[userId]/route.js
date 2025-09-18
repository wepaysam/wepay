import { NextResponse } from 'next/server';
import { updatePermissions } from '../../../../controllers/adminController';
import { adminAuthMiddleware } from '../../../../middleware/authMiddleware';

export async function PUT(request, { params }) {
  console.log("PUT /api/admin/update-permissions/[userId] reached");
  try {
    const authError = await adminAuthMiddleware(request);
    if (authError) return authError;
    const targetUserId = params.userId;
    console.log("Target userId from URL params:", targetUserId);
    const { permissions } = await request.json();
    console.log("Received permissions from frontend:", permissions);

    const updatedUser = await updatePermissions(targetUserId, permissions);

    return NextResponse.json({
      message: 'User permissions updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error in /api/admin/update-permissions/[userId]:", error);
    return NextResponse.json(
      { message: error.message || 'Failed to update user permissions' },
      { status: 500 }
    );
  }
}