
import { NextResponse } from 'next/server';
import { verifiedUserMiddleware } from '../../middleware/authMiddleware';
import { getAllCharges } from '../../controllers/chargeController';

export async function GET(request) {
  try {
    const authResult = await verifiedUserMiddleware(request);
    if (authResult) {
      return authResult; // Return error response if authentication fails
    }

    const charges = await getAllCharges();
    return NextResponse.json({ charges });

  } catch (error) {
    console.error("Failed to fetch transaction charges:", error);
    return NextResponse.json({ message: 'Failed to fetch transaction charges' }, { status: 500 });
  }
}
