import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';
import { adminAuthMiddleware } from '../../../../../middleware/authMiddleware';

export async function GET(request, { params }) {
  const authError = await adminAuthMiddleware(request);
  if (authError) {
    return authError;
  }

  const { id } = params;

  try {
    const charges = await prisma.userTransactionCharge.findMany({
      where: { userId: id },
    });
    return NextResponse.json({ charges });
  } catch (error) {
    console.error('Error fetching user charges:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const authError = await adminAuthMiddleware(request);
  if (authError) {
    return authError;
  }

  const { id } = params;
  const { charge, minAmount, maxAmount, type } = await request.json();

  try {
    const newCharge = await prisma.userTransactionCharge.create({
      data: {
        charge: parseFloat(charge),
        minAmount: parseFloat(minAmount),
        maxAmount: parseFloat(maxAmount),
        type,
        userId: id,
      },
    });
    return NextResponse.json({ charge: newCharge });
  } catch (error) {
    console.error('Error creating user charge:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}