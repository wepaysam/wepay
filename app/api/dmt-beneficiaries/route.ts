
import { NextResponse } from 'next/server';
import { verifiedUserMiddleware } from '../../middleware/authMiddleware';
import prisma from '../../lib/prisma';

export async function POST(request) {
  try {
    const authResult = await verifiedUserMiddleware(request);
        if (authResult) {
          console.log('Authentication failed:', authResult.status);
          return authResult;
        }
        
        const userId = request.user.id;
        console.log('Authenticated user ID:', userId);
    const body = await request.json();
    let { accountNumber, accountHolderName, ifscCode } = body;

    if (accountNumber) {
      accountNumber = accountNumber.trim();
    }

    if (!accountNumber || !accountHolderName || !userId) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Check if beneficiary already exists for this user
    const existingBeneficiary = await prisma.dmtBeneficiary.findFirst({
      where: {
        userId: userId,
        accountNumber: accountNumber,
      },
    });

    if (existingBeneficiary) {
      return NextResponse.json({ message: 'Beneficiary with this account number already exists for this user' }, { status: 409 });
    }

    const dmtBeneficiary = await prisma.dmtBeneficiary.create({
      data: {
        userId,
        accountNumber,
        accountHolderName,
        ifscCode,
        isVerified: false, // Assuming initial state is unverified
      },
    });

    return NextResponse.json(dmtBeneficiary, { status: 201 });
  } catch (error) {
    console.error('Error adding DMT beneficiary:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const authResult = await verifiedUserMiddleware(request);
    if (authResult) {
      console.log('Authentication failed:', authResult.status);
      return authResult;
    }
    
    const userId = request.user.id;
    // console.log('Authenticated user ID:', userId);

    if (!userId) {
      return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
    }

    const dmtBeneficiaries = await prisma.dmtBeneficiary.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ dmtBeneficiaries }, { status: 200 });
  } catch (error) {
    console.error('Error fetching DMT beneficiaries:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const authResult = await verifiedUserMiddleware(request);
    if (authResult) {
      return authResult;
    }
    
    const userId = request.user.id;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: 'Beneficiary ID is required' }, { status: 400 });
    }

    const beneficiary = await prisma.dmtBeneficiary.findFirst({
      where: {
        id: id,
        userId: userId,
      },
    });

    if (!beneficiary) {
      return NextResponse.json({ message: 'Beneficiary not found or you do not have permission to delete it' }, { status: 404 });
    }

    await prisma.dmtBeneficiary.delete({
      where: {
        id: id,
      },
    });

    return NextResponse.json({ message: 'DMT Beneficiary deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting DMT beneficiary:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
