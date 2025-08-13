import prisma from '../lib/prisma';

export async function createBeneficiary(data, userId) {
  try {
    // Check if beneficiary already exists with the same account number
    const existingBeneficiary = await prisma.beneficiary.findUnique({
      where: {
        accountNumber: data.accountNumber,
      },
    });

    if (existingBeneficiary) {
      throw new Error('Beneficiary with this account number already exists');
    }

    // Create new beneficiary
    const newBeneficiary = await prisma.beneficiary.create({
      data: {
        userId,
        accountNumber: data.accountNumber,
        accountHolderName: data.accountHolderName,
        ifscCode: data.ifscCode, // Add this line
        transactionType: data.transactionType,
      },
    });

    return newBeneficiary;
  } catch (error) {
    throw new Error(`Failed to create beneficiary: ${error.message}`);
  }
}


  export async function createUpiBeneficiary(data, userId) {
  try {
    // Check if UPI beneficiary already exists with the same upiId
    const existingUpiBeneficiary = await prisma.upiBeneficiary.findUnique({
      where: {
        upiId: data.upiId,
      },
    });

    if (existingUpiBeneficiary) {
      throw new Error('UPI Beneficiary with this UPI ID already exists');
    }

    // Create new UPI beneficiary
    const newUpiBeneficiary = await prisma.upiBeneficiary.create({
      data: {
        userId,
        upiId: data.upiId,
        accountHolderName: data.accountHolderName,
      },
    });

    return newUpiBeneficiary;
  } catch (error) {
    throw new Error(`Failed to create UPI beneficiary: ${error.message}`);
  }
}

export async function getBeneficiaries(userId) {
  try {
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

    return { bankBeneficiaries, upiBeneficiaries };
  } catch (error) {
    throw new Error(`Failed to get beneficiaries: ${error.message}`);
  }
}

export async function getBeneficiaryById(id, userId) {
  try {
    const beneficiary = await prisma.beneficiary.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!beneficiary) {
      throw new Error('Beneficiary not found');
    }

    return beneficiary;
  } catch (error) {
    throw new Error(`Failed to get beneficiary: ${error.message}`);
  }
}

export async function updateBeneficiary(id, data, userId) {
  try {
    // Check if beneficiary exists and belongs to the user
    const existingBeneficiary = await prisma.beneficiary.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingBeneficiary) {
      throw new Error('Beneficiary not found');
    }

    // If account number is changed, check if new account number already exists
    if (
      data.accountNumber && 
      data.accountNumber !== existingBeneficiary.accountNumber
    ) {
      const duplicateAccount = await prisma.beneficiary.findUnique({
        where: {
          accountNumber: data.accountNumber,
        },
      });

      if (duplicateAccount) {
        throw new Error('Beneficiary with this account number already exists');
      }
    }

    // Update beneficiary
    const updatedBeneficiary = await prisma.beneficiary.update({
      where: {
        id,
      },
      data: {
        accountHolderName: data.accountHolderName || existingBeneficiary.accountHolderName,
        accountNumber: data.accountNumber || existingBeneficiary.accountNumber,
        transactionType: data.transactionType || existingBeneficiary.transactionType,
      },
    });

    return updatedBeneficiary;
  } catch (error) {
    throw new Error(`Failed to update beneficiary: ${error.message}`);
  }
}

export async function deleteBeneficiary(id, userId) {
  try {
    // Check if beneficiary exists and belongs to the user
    const existingBeneficiary = await prisma.beneficiary.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingBeneficiary) {
      throw new Error('Beneficiary not found');
    }

    // Delete beneficiary
    await prisma.beneficiary.delete({
      where: {
        id,
      },
    });

    return { message: 'Beneficiary deleted successfully' };
  } catch (error) {
    throw new Error(`Failed to delete beneficiary: ${error.message}`);
  }
}

export async function verifyBeneficiary(id) {
  try {
    const updatedBeneficiary = await prisma.beneficiary.update({
      where: {
        id,
      },
      data: {
        isVerified: true,
      },
    });

    return updatedBeneficiary;
  } catch (error) {
    throw new Error(`Failed to verify beneficiary: ${error.message}`);
  }
}

export async function verifyBeneficiaryWithCharge(beneficiaryId) {
  try {
    // Find the beneficiary with its associated user
    const beneficiary = await prisma.beneficiary.findUnique({
      where: { id: beneficiaryId },
      include: { user: true }
    });

    if (!beneficiary) {
      throw new Error('Beneficiary not found');
    }

    const verificationCharge = 1.00; // 1 rupee charge
    const userBalance = parseFloat(beneficiary.user.balance);

    // Check if user has sufficient balance
    if (userBalance < verificationCharge) {
      throw new Error('Insufficient balance for verification');
    }

    // Perform operations in a transaction to ensure atomicity
    const result = await prisma.$transaction(async (prisma) => {
      // Deduct verification charge from user balance
      const updatedUser = await prisma.user.update({
        where: { id: beneficiary.userId },
        data: { balance: { decrement: verificationCharge } }
      });

      // Update beneficiary verification status
      const verifiedBeneficiary = await prisma.beneficiary.update({
        where: { id: beneficiaryId },
        data: { isVerified: true }
      });

      return { user: updatedUser, beneficiary: verifiedBeneficiary };
    });

    return result;
  } catch (error) {
    console.error("Error in verifyBeneficiaryWithCharge:", error);
    return {
      success: false,
      status: 500,
      message: "Failed to verify beneficiary"
    };
  }
}
