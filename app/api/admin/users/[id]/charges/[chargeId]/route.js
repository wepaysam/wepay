import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../../../lib/prisma';
import { adminAuthMiddleware } from '../../../../../../middleware/authMiddleware';

export async function PUT(request, context) {
  const authError = await adminAuthMiddleware(request);
  if (authError) {
    return authError;
  }

  const { chargeId } = context.params;
  const { charge, minAmount, maxAmount, type } = await request.json();

  try {
    const updatedCharge = await prisma.userTransactionCharge.update({
      where: { id: chargeId },
      data: {
        charge: parseFloat(charge),
        minAmount: parseFloat(minAmount),
        maxAmount: parseFloat(maxAmount),
        type,
      },
    });
    return NextResponse.json({ charge: updatedCharge });
  } catch (error) {
    console.error('Error updating user charge:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  const authError = await adminAuthMiddleware(request);
  if (authError) {
    return authError;
  }

  const { chargeId } = context.params;

  try {
    await prisma.userTransactionCharge.delete({
      where: { id: chargeId },
    });
    return NextResponse.json({ message: 'Charge deleted successfully' });
  } catch (error) {
    console.error('Error deleting user charge:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}