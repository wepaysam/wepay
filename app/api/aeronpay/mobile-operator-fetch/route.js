import { NextResponse } from 'next/server';
import { authMiddleware } from '../../../middleware/authMiddleware';
import { AeronpayMobileOperatorFetch } from '../../../controllers/aeronpayController';

export async function POST(req) {
  try {
    const authResponse = await authMiddleware(req);
    if (authResponse) {
      return authResponse;
    }
    return await AeronpayMobileOperatorFetch(req);
  } catch (error) {
    console.error('Error in Aeronpay mobile operator fetch route:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
