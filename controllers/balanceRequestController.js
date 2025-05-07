import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Create a new balance request
export async function createBalanceRequest(data, userId) {
  try {
    // Create balance request in database
    const balanceRequest = await prisma.balanceRequest.create({
      data: {
        userId,
        amount: parseFloat(data.amount),
        UTRnumber: data.UTRnumber,
        isConfirmed: false,
      },
    });
    
    return balanceRequest;
  } catch (error) {
    console.error('Error creating balance request:', error);
    throw new Error('Failed to create balance request');
  }
}

// Get balance requests for a user
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
    console.error('Error fetching user balance requests:', error);
    throw new Error('Failed to fetch balance requests');
  }
}

// Get all balance requests (for admin)
export async function getAllBalanceRequests() {
  try {
    const balanceRequests = await prisma.balanceRequest.findMany({
      include: {
        user: {
          select: {
            phoneNumber: true,
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
    console.error('Error fetching all balance requests:', error);
    throw new Error('Failed to fetch balance requests');
  }
}

// Approve a balance request (admin only)
export async function approveBalanceRequest(requestId) {
  try {
    // Start a transaction
    return await prisma.$transaction(async (prisma) => {
      // Find the balance request
      const balanceRequest = await prisma.balanceRequest.findUnique({
        where: { id: requestId },
        include: { user: true },
      });
      
      if (!balanceRequest) {
        throw new Error('Balance request not found');
      }
      
      if (balanceRequest.isConfirmed) {
        throw new Error('Balance request already processed');
      }
      
      // Update the balance request
      const updatedRequest = await prisma.balanceRequest.update({
        where: { id: requestId },
        data: { isConfirmed: true },
      });
      
      // Update user's balance
      await prisma.user.update({
        where: { id: balanceRequest.userId },
        data: {
          balance: {
            increment: balanceRequest.amount,
          },
        },
      });
      
      // Create a transaction record
      await prisma.transaction.create({
        data: {
          userId: balanceRequest.userId,
          amount: balanceRequest.amount,
          type: 'CREDIT',
          status: 'COMPLETED',
          description: `Balance top-up - UTR: ${balanceRequest.UTRnumber}`,
        },
      });
      
      return updatedRequest;
    });
  } catch (error) {
    console.error('Error approving balance request:', error);
    throw new Error(error.message || 'Failed to approve balance request');
  }
}

// Reject a balance request (admin only)
export async function rejectBalanceRequest(requestId) {
  try {
    const balanceRequest = await prisma.balanceRequest.findUnique({
      where: { id: requestId },
    });
    
    if (!balanceRequest) {
      throw new Error('Balance request not found');
    }
    
    if (balanceRequest.isConfirmed) {
      throw new Error('Balance request already processed');
    }
    
    // Update the balance request to rejected
    const updatedRequest = await prisma.balanceRequest.update({
      where: { id: requestId },
      data: { isRejected: true },
    });
    
    return updatedRequest;
  } catch (error) {
    console.error('Error rejecting balance request:', error);
    throw new Error(error.message || 'Failed to reject balance request');
  }
}
