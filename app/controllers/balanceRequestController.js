import prisma from '../lib/prisma';
import { updateUserBalance } from './userController';

export async function createBalanceRequest(data, userId) {
  try {
    // Create balance request
    const balanceRequest = await prisma.balanceRequest.create({
      data: {
        userId,
        amount: data.amount,
        UTRnumber: data.transactionId,
      },
    });

    return balanceRequest;
  } catch (error) {
    throw new Error(`Failed to create balance request: ${error.message}`);
  }
}

export async function getUserBalanceRequests(userId) {
  try {
    const balanceRequests = await prisma.balanceRequest.findMany({
      where: {
        userId,
      },
      orderBy: {
        requestedAt: 'desc',
      },
    });

    return balanceRequests;
  } catch (error) {
    throw new Error(`Failed to get user balance requests: ${error.message}`);
  }
}

export async function getBalanceRequestById(id, userId) {
  try {
    const balanceRequest = await prisma.balanceRequest.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!balanceRequest) {
      throw new Error('Balance request not found');
    }

    return balanceRequest;
  } catch (error) {
    throw new Error(`Failed to get balance request: ${error.message}`);
  }
}

export async function confirmBalanceRequest(id, adminId) {
  try {
    // Start a transaction to ensure atomicity
    return await prisma.$transaction(async (prisma) => {
      // Find the balance request
      const balanceRequest = await prisma.balanceRequest.findUnique({
        where: {
          id,
        },
        include: {
          user: true,
        },
      });

      if (!balanceRequest) {
        throw new Error('Balance request not found');
      }

      if (balanceRequest.isConfirmed) {
        throw new Error('Balance request is already confirmed');
      }

      // Update user balance
      const updatedUser = await prisma.user.update({
        where: {
          id: balanceRequest.userId,
        },
        data: {
          balance: {
            increment: parseFloat(balanceRequest.amount),
          },
        },
      });

      // Mark balance request as confirmed
      const updatedBalanceRequest = await prisma.balanceRequest.update({
        where: {
          id,
        },
        data: {
          isConfirmed: true,
        },
      });

      return {
        balanceRequest: updatedBalanceRequest,
        user: {
          id: updatedUser.id,
          balance: updatedUser.balance,
        },
      };
    });
  } catch (error) {
    throw new Error(`Failed to confirm balance request: ${error.message}`);
  }
}

export async function getAllBalanceRequests() {
  try {
    // Only admin can get all balance requests
    const balanceRequests = await prisma.balanceRequest.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: {
        requestedAt: 'desc',
      },
    });

    return balanceRequests;
  } catch (error) {
    throw new Error(`Failed to get all balance requests: ${error.message}`);
  }
}
