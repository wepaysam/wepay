import { NextResponse } from 'next/server';
import prisma from '../../lib/prisma';
import { verifiedUserMiddleware } from '../../../app/middleware/authMiddleware';
import { getUserId } from '../../utils/auth';

export async function GET(request) {
  try {
    const authResult = await verifiedUserMiddleware(request);
        if (authResult) return authResult;
        
        const userId = request.user.id;

    const bankBeneficiaries = await prisma.beneficiary.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        accountNumber: true,
        accountHolderName: true,
        ifscCode: true,
        isVerified: true,
        createdAt: true,
        userId: true,
        transactionType: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const upiBeneficiaries = await prisma.upiBeneficiary.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ bankBeneficiaries, upiBeneficiaries });
  } catch (error) {
    return NextResponse.json({ message: `Failed to get beneficiaries: ${error.message}` }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const authResult = await verifiedUserMiddleware(request);
        if (authResult) return authResult;
        
        const userId = request.user.id;

    const data = await request.json();

    if (data.accountNumber) {
      const existingBeneficiary = await prisma.beneficiary.findUnique({
        where: {
          accountNumber: data.accountNumber,
        },
      });

      if (existingBeneficiary) {
        return NextResponse.json({ message: 'Beneficiary with this account number already exists' }, { status: 400 });
      }

      const newBeneficiary = await prisma.beneficiary.create({
        data: {
          userId,
          accountNumber: data.accountNumber,
          accountHolderName: data.accountHolderName,
          ifscCode: data.ifscCode,
          transactionType: data.transactionType,
        },
      });

      return NextResponse.json(newBeneficiary);
    } else if (data.upiId) {
      const existingUpiBeneficiary = await prisma.upiBeneficiary.findUnique({
        where: {
          upiId: data.upiId,
        },
      });

      if (existingUpiBeneficiary) {
        return NextResponse.json({ message: 'UPI Beneficiary with this UPI ID already exists' }, { status: 400 });
      }

      const newUpiBeneficiary = await prisma.upiBeneficiary.create({
        data: {
          userId,
          upiId: data.upiId,
          accountHolderName: data.accountHolderName,
        },
      });

      return NextResponse.json(newUpiBeneficiary);
    } else {
      return NextResponse.json({ message: 'Invalid beneficiary data' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ message: `Failed to create beneficiary: ${error.message}` }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const authResult = await verifiedUserMiddleware(request);
        if (authResult) return authResult;
        
        const userId = request.user.id;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type');

    if (type === 'bank') {
      const existingBeneficiary = await prisma.beneficiary.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!existingBeneficiary) {
        return NextResponse.json({ message: 'Beneficiary not found' }, { status: 404 });
      }

      await prisma.beneficiary.delete({
        where: {
          id,
        },
      });
    } else if (type === 'upi') {
      const existingUpiBeneficiary = await prisma.upiBeneficiary.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!existingUpiBeneficiary) {
        return NextResponse.json({ message: 'UPI Beneficiary not found' }, { status: 404 });
      }

      await prisma.upiBeneficiary.delete({
        where: {
          id,
        },
      });
    } else {
      return NextResponse.json({ message: 'Invalid beneficiary type' }, { status: 400 });
    }

    return NextResponse.json({ message: 'Beneficiary deleted successfully' });
  } catch (error) {
    return NextResponse.json({ message: `Failed to delete beneficiary: ${error.message}` }, { status: 500 });
  }
}