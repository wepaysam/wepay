
import { NextResponse } from 'next/server';
import { verifiedUserMiddleware } from '../../middleware/authMiddleware';
import prisma from '../../lib/prisma';

export async function POST(request) {
  try {
    const authResult = await verifiedUserMiddleware(request);
    if (authResult) return authResult;

    const { accountNumber, ifsc } = await request.json();
    
    const userId = request.user.id;

    // Find the user to get their mobile number
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const response = await fetch('https://api.aeronpay.in/api/serviceapi-prod/api/verification/bankaccount', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'client-id': process.env.AERONPAY_CLIENT_ID,
        'client-secret': process.env.AERONPAY_CLIENT_SECRET,
      },
      body: JSON.stringify({
        consent: 'Y',
        clientData: {
          client_id: process.env.AERONPAY_CLIENT_ID,
        },
        mobile: user.phoneNumber,
        ifsc: ifsc,
        accountNumber: accountNumber,
      }),
    });

    const verificationResult = await response.json();

    // Assuming the API call is successful, update the beneficiary's status
    if (verificationResult.status === 'SUCCESS') {
      await prisma.beneficiary.updateMany({
        where: {
          accountNumber: accountNumber,
          userId: userId,
        },
        data: {
          isVerified: true,
        },
      });

      return NextResponse.json({ message: 'Account verified successfully' });
    } else {
      return NextResponse.json({ message: verificationResult.message || 'Failed to verify account' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ message: error.message || 'Failed to verify account' }, { status: 500 });
  }
}
