import { NextResponse } from 'next/server';
import { 
  createBeneficiary, 
  createUpiBeneficiary,
  getBeneficiaries,
  verifyBeneficiaryWithCharge
} from '../../controllers/beneficiaryController';
import { verifiedUserMiddleware } from '../../middleware/authMiddleware';

export async function POST(request) {
  try {
    // Check authentication
    const authResult = await verifiedUserMiddleware(request);
    if (authResult) return authResult;
    
    const data = await request.json();
    const userId = request.user.id;
    
    // Validate required fields
    if (data.transactionType === 'UPI') {
      if (!data.upiId || !data.accountHolderName) {
        return NextResponse.json(
          { message: 'UPI ID and account holder name are required for UPI beneficiary' },
          { status: 400 }
        );
      }
      const beneficiary = await createUpiBeneficiary(data, userId);
      return NextResponse.json(beneficiary, { status: 201 });
    } else {
      if (!data.accountNumber || !data.accountHolderName || !data.transactionType) {
        return NextResponse.json(
          { message: 'Account number, account holder name, and transaction type are required' },
          { status: 400 }
        );
      }
      const beneficiary = await createBeneficiary(data, userId);
      return NextResponse.json(beneficiary, { status: 201 });
    }
  } catch (error) {
    return NextResponse.json(
      { message: error.message || 'Failed to create beneficiary' },
      { status: 400 }
    );
  }
}

export async function GET(request) {
  try {
    // Check authentication
    const authResult = await verifiedUserMiddleware(request);
    if (authResult) return authResult;
    
    const userId = request.user.id;
    const { bankBeneficiaries, upiBeneficiaries } = await getBeneficiaries(userId);
    
    return NextResponse.json({ bankBeneficiaries, upiBeneficiaries });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || 'Failed to get beneficiaries' },
      { status: 400 }
    );
  }
}

export async function PUT(request) {
  try {
    const { beneficiaryId } = await request.json();

    const authResult = await verifiedUserMiddleware(request);
    if (authResult) return authResult;

    // Update beneficiary verification status
    const beneficiary = await verifyBeneficiaryWithCharge(beneficiaryId);

    return NextResponse.json(beneficiary);
  } catch (error) {
    console.error('Error verifying beneficiary:', error);
    return NextResponse.json(
      { error: 'Failed to verify beneficiary' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { beneficiaryId } = await request.json();

    const authResult = await verifiedUserMiddleware(request);
    if (authResult) return authResult;

    // Delete beneficiary
    const beneficiary = await prisma.beneficiary.delete({
      where: { id: beneficiaryId }
    });

    return NextResponse.json(beneficiary);
  } catch (error) {
    console.error('Error deleting beneficiary:', error);
    return NextResponse.json(
      { error: 'Failed to delete beneficiary' },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const { beneficiaryId } = await request.json();

    const authResult = await verifiedUserMiddleware(request);
    if (authResult) return authResult;

    // Update beneficiary
    const beneficiary = await prisma.beneficiary.update({
      where: { id: beneficiaryId },
      data: { isVerified: false }
    });

    return NextResponse.json(beneficiary);
  } catch (error) {
    console.error('Error updating beneficiary:', error);
    return NextResponse.json(
      { error: 'Failed to update beneficiary' },
      { status: 500 }
    );
  }
}
