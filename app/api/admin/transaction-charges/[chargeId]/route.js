import { updateTransactionCharge, deleteTransactionCharge } from '../../../../controllers/adminController';
import { adminAuthMiddleware } from '../../../../middleware/authMiddleware';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
  try {
    const authError = await adminAuthMiddleware(request);
    if (authError) return authError;

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

export async function DELETE(request, { params }) {
  try {
    const authError = await adminAuthMiddleware(request);
    if (authError) return authError;

    const { chargeId } = params;

    await deleteTransactionCharge(chargeId);
    return NextResponse.json({ message: 'Transaction charge deleted successfully' });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
