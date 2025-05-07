import prisma from '../lib/prisma';

export async function createTransactionCharge(data) {
  try {
    // Check for overlapping ranges
    const overlappingCharge = await prisma.transactionCharge.findFirst({
      where: {
        OR: [
          {
            minAmount: { lte: data.maxAmount },
            maxAmount: { gte: data.minAmount },
          },
        ],
      },
    });

    if (overlappingCharge) {
      throw new Error(
        'Overlapping charge range: A transaction charge already exists for this amount range'
      );
    }

    // Create transaction charge
    const transactionCharge = await prisma.transactionCharge.create({
      data: {
        minAmount: data.minAmount,
        maxAmount: data.maxAmount,
        charge: data.charge,
      },
    });

    return transactionCharge;
  } catch (error) {
    throw new Error(`Failed to create transaction charge: ${error.message}`);
  }
}

export async function getTransactionCharges() {
  try {
    const transactionCharges = await prisma.transactionCharge.findMany({
      orderBy: {
        minAmount: 'asc',
      },
    });

    return transactionCharges;
  } catch (error) {
    throw new Error(`Failed to get transaction charges: ${error.message}`);
  }
}

export async function getTransactionChargeById(id) {
  try {
    const transactionCharge = await prisma.transactionCharge.findUnique({
      where: {
        id,
      },
    });

    if (!transactionCharge) {
      throw new Error('Transaction charge not found');
    }

    return transactionCharge;
  } catch (error) {
    throw new Error(`Failed to get transaction charge: ${error.message}`);
  }
}

export async function updateTransactionCharge(id, data) {
  try {
    // Check for overlapping ranges excluding current charge
    const overlappingCharge = await prisma.transactionCharge.findFirst({
      where: {
        id: { not: id },
        OR: [
          {
            minAmount: { lte: data.maxAmount },
            maxAmount: { gte: data.minAmount },
          },
        ],
      },
    });

    if (overlappingCharge) {
      throw new Error(
        'Overlapping charge range: A transaction charge already exists for this amount range'
      );
    }

    // Update transaction charge
    const updatedTransactionCharge = await prisma.transactionCharge.update({
      where: {
        id,
      },
      data: {
        minAmount: data.minAmount,
        maxAmount: data.maxAmount,
        charge: data.charge,
      },
    });

    return updatedTransactionCharge;
  } catch (error) {
    throw new Error(`Failed to update transaction charge: ${error.message}`);
  }
}

export async function deleteTransactionCharge(id) {
  try {
    // Delete transaction charge
    await prisma.transactionCharge.delete({
      where: {
        id,
      },
    });

    return { message: 'Transaction charge deleted successfully' };
  } catch (error) {
    throw new Error(`Failed to delete transaction charge: ${error.message}`);
  }
}
