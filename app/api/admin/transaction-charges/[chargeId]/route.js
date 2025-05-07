import { updateTransactionCharge } from '../../../../controllers/adminController';
import { adminAuthMiddleware } from '../../../../middleware/authMiddleware';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
  try {
    const { chargeId } = params;
    const data = await request.json();
    const updatedCharge = await updateTransactionCharge(chargeId, data);
    return NextResponse.json(updatedCharge);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}   