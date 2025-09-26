import { NextResponse } from 'next/server';
import { authMiddleware } from '../../../middleware/authMiddleware';
import prisma from '../../../lib/prisma';

export async function GET(request) {
  try {
    const authError = await authMiddleware(request);
    if (authError) return authError;

    const userId = request.user.id;
    const { searchParams } = new URL(request.url);
    const beneficiaryId = searchParams.get('beneficiaryId');
    const beneficiaryType = searchParams.get('beneficiaryType'); // 'bank', 'upi', 'dmt'

    if (!beneficiaryId || !beneficiaryType) {
      return NextResponse.json({ message: 'Beneficiary ID and type are required.' }, { status: 400 });
    }

    let whereClause = {
      senderId: userId,
    };

    if (beneficiaryType === 'bank') {
      whereClause.beneficiaryId = beneficiaryId;
    } else if (beneficiaryType === 'upi') {
      whereClause.upiBeneficiaryId = beneficiaryId;
    } else if (beneficiaryType === 'dmt') {
      whereClause.dmtBeneficiaryId = beneficiaryId;
    } else {
      return NextResponse.json({ message: 'Invalid beneficiary type.' }, { status: 400 });
    }

    const lastTransaction = await prisma.transactions.findFirst({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        amount: true,
        createdAt: true,
        transactionStatus: true,
      },
    });

    if (!lastTransaction) {
      return NextResponse.json({ message: 'No previous transactions found for this beneficiary.' }, { status: 404 });
    }

    return NextResponse.json(lastTransaction);
  } catch (error) {
    console.error('Error fetching last beneficiary transaction:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch last beneficiary transaction.' },
      { status: 500 }
    );
  }
}