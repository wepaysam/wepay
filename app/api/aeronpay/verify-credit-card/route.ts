
import { NextResponse } from 'next/server';
import { verifiedUserMiddleware } from '../../../middleware/authMiddleware';

export async function POST(request: Request) {
  try {
    const authResult = await verifiedUserMiddleware(request);
    if (authResult) {
      return authResult;
    }

    const { cardNumber } = await request.json();

    // In a real application, you would use the Aeronpay API here
    // For now, we'll simulate a successful verification
    if (cardNumber === '1234567890123456') {
      return NextResponse.json({ status: 'success', name: 'Test User' });
    } else {
      return NextResponse.json({ status: 'fail', message: 'Invalid card number' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error verifying credit card:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
