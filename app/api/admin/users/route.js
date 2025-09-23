import { NextResponse } from 'next/server';
import { adminAuthMiddleware } from '../../../middleware/authMiddleware';
import prisma from '../../../lib/prisma';

export async function GET(request) {
  try {
    const authError = await adminAuthMiddleware(request);
    if (authError) return authError;

    const users = await prisma.user.findMany({
      take: 10,
      select: {
        id: true,
        fullName: true,
        email: true,
        balance: true,
      },
      orderBy: {
        balance: 'desc',
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
