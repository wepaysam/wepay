import { NextResponse } from 'next/server';
import { verifiedUserMiddleware } from '../../middleware/authMiddleware';
import prisma from '../../lib/prisma';

export async function POST(request) {
  try {
    const authResult = await verifiedUserMiddleware(request);
    if (authResult) return authResult;

    // --- START: TESTING BLOCK ---
    // If the TESTING env variable is '1', return a mock success response immediately.
    // This skips the external API call AND any database interactions.
    if (process.env.TESTING === '1') {
      console.log('--- RUNNING IN TEST MODE: SKIPPING EXTERNAL API & DB ---');
      return NextResponse.json({ 
        message: 'Account verified successfully (TEST MODE)',
        accountName: 'Mock Test User' // A static name for testing
      });
    }
    // --- END: TESTING BLOCK ---


    const { accountNumber, ifsc } = await request.json();
    
    const userId = request.user.id;

    // Find the user to get their mobile number (still needed for the real API call)
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Generate current date and time for IMPS
    const currentDateTime = new Date().toISOString();

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
          client_id: currentDateTime,
        },
        mobile: user.phoneNumber,
        ifsc: ifsc,
        accountNumber: accountNumber,
      }),
    });

    const verificationResult = await response.json();

    if (verificationResult.status === 'success' && verificationResult.statusCode === '101') {
      const verifiedName = verificationResult.accountName;

      if (!verifiedName || verifiedName.trim() === '') {
        return NextResponse.json({ 
          message: 'Account verification failed: Account name not found or invalid' 
        }, { status: 400 });
      }

      const beneficiary = await prisma.beneficiary.findFirst({
        where: {
          accountNumber: accountNumber,
          userId: userId,
        },
      });

      if (!beneficiary) {
        return NextResponse.json({ message: 'Beneficiary not found in your records.' }, { status: 404 });
      }

      const updateData = {
        isVerified: true,
      };

      if ((beneficiary.beneficiaryName ?? '').toLowerCase() !== verifiedName.toLowerCase()) {
        updateData.beneficiaryName = verifiedName;
      }

      await prisma.beneficiary.updateMany({
        where: {
          accountNumber: accountNumber,
          userId: userId,
        },
        data: updateData,
      });

      return NextResponse.json({ 
        message: 'Account verified successfully',
        accountName: verifiedName 
      });
    } else {
      return NextResponse.json({ 
        message: verificationResult.message || 'Failed to verify account' 
      }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ message: error.message || 'Failed to verify account' }, { status: 500 });
  }
}