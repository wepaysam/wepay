import { NextResponse } from 'next/server';
import { adminAuthMiddleware } from '../../../../middleware/authMiddleware';
import prisma from '../../../../lib/prisma';

export async function PUT(request, { params }) {
  try {
    const authError = await adminAuthMiddleware(request);
    if (authError) return authError;

    const { id } = params;
    const { fullName, email, phoneNumber } = await request.json();

    if (!fullName || !phoneNumber) {
      return NextResponse.json({ message: 'Full name and phone number are required.' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: id },
      data: {
        fullName,
        email,
        phoneNumber,
      },
    });

    return NextResponse.json({ message: 'User details updated successfully.', user: updatedUser });
  } catch (error) {
    console.error('Error updating user details:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to update user details.' },
      { status: 500 }
    );
  }
}