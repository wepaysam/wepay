import { NextResponse } from 'next/server';
import { adminAuthMiddleware } from '../../../../../middleware/authMiddleware';
import prisma from '../../../../../lib/prisma';

export async function POST(request, { params }) {
  try {
    const authError = await adminAuthMiddleware(request);
    if (authError) return authError;

    const userId = params.id;
    const { isDisabled } = await request.json();

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isDisabled: isDisabled,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error toggling user disable status:", error);
    return NextResponse.json(
      { message: error.message || 'Failed to toggle user disable status' },
      { status: 500 }
    );
  }
}
