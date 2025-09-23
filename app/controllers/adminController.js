import prisma from '../lib/prisma';

/**
 * Get dashboard stats for admin
 */
export async function getDashboardStats() {
  try {
    // Get count of unverified users
    const unverifiedUsersCount = await prisma.user.count({
      where: { userType: 'UNVERIFIED' }
    });

    // Get count of verified users
    const verifiedUsersCount = await prisma.user.count({
      where: { userType: 'VERIFIED' }
    });

    // Get count of balance requests
    const balanceRequestsCount = await prisma.balanceRequest.count();

    // Get count of transactions
    const transactionsCount = await prisma.transactions.count();

    // Get total sum of all user balances
    const totalUserBalanceAggregate = await prisma.user.aggregate({
      _sum: {
        balance: true,
      },
    });
    const totalUserBalance = totalUserBalanceAggregate._sum.balance || 0;

    return {
      unverifiedUsers: unverifiedUsersCount,
      verifiedUsers: verifiedUsersCount,
      balanceRequests: balanceRequestsCount,
      transactions: transactionsCount,
      totalUserBalance: totalUserBalance,
    };
  } catch (error) {
    throw new Error(`Failed to get dashboard stats: ${error.message}`);
  }
}

/**
 * Get all unverified users
 */
export async function getUnverifiedUsers() {
  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { userType: 'PROPRIETOR_UNVERIFIED' },
          { userType: 'COMPANY_UNVERIFIED' },
        ],
      },
      include: {
        directors: true,
        documents: true,
        officePhotos: true,
      },
    });

    return users;
  } catch (error) {
    throw new Error(`Failed to get unverified users: ${error.message}`);
  }
}

/**
 * Verify a user by changing their userType to VERIFIED
 */
export async function verifyUser(userId) {
  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    let newUserType;
    if (user.userType === 'PROPRIETOR_UNVERIFIED') {
      newUserType = 'PROPRIETOR_VERIFIED';
    } else if (user.userType === 'COMPANY_UNVERIFIED') {
      newUserType = 'COMPANY_VERIFIED';
    } else {
      throw new Error('User is already verified or has an invalid user type.');
    }

    // Update user's type to VERIFIED
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        userType: newUserType,
        isKycVerified: true
      }
    });

    return updatedUser;
  } catch (error) {
    throw new Error(`Failed to verify user: ${error.message}`);
  }
}

/**
 * Get all balance requests
 */
export async function getBalanceRequests() {
  try {
    const requests = await prisma.balanceRequest.findMany({
      select: {
        id: true,
        amount: true,
        UTRnumber: true,
        status: true,
        createdAt: true,
        previousBalance: true,
        closingBalance: true,
        user: {
          select: {
            phoneNumber: true,
            email: true,
            fullName: true, // Added fullName for user number/name
          }
        }
      },
      orderBy: { 
        createdAt: 'desc' 
      }
    });

    return requests;
  } catch (error) {
    throw new Error(`Failed to get balance requests: ${error.message}`);
  }
}

/**
 * Approve a balance request
 */
export async function approveBalanceRequest(requestId) {
  try {
    // Get the request
    const request = await prisma.balanceRequest.findUnique({
      where: { id: requestId },
      include: { user: true }
    });

    if (!request) {
      throw new Error('Balance request not found');
    }

    // Check if request is already processed
    if (request.status !== 'PENDING') {
      throw new Error(`Balance request is already ${request.status.toLowerCase()}`);
    }

    // Start a transaction to update balance and request status
    return await prisma.$transaction(async (prisma) => {
      // Get user's current balance before update
      const userBeforeUpdate = await prisma.user.findUnique({
        where: { id: request.userId },
        select: { balance: true }
      });
      const previousBalance = userBeforeUpdate.balance;

      // Update the user's balance
      const updatedUser = await prisma.user.update({
        where: { id: request.userId },
        data: {
          balance: {
            increment: request.amount
          }
        }
      });
      const closingBalance = updatedUser.balance;

      // Update the request status and store balance history
      const updatedRequest = await prisma.balanceRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          previousBalance: previousBalance,
          closingBalance: closingBalance
        }
      });

      // Create a transaction record
      // await prisma.transaction.create({
      //   data: {
      //     userId: request.userId,
      //     amount: request.amount,
      //     type: 'CREDIT',
      //     description: `Balance Request #${requestId} Approved`,
      //     status: 'COMPLETED'
      //   }
      // });

      return updatedRequest;
    });
  } catch (error) {
    throw new Error(`Failed to approve balance request: ${error.message}`);
  }
}

/**
 * Reject a balance request
 */
export async function rejectBalanceRequest(requestId) {
  try {
    // Check if request exists
    const request = await prisma.balanceRequest.findUnique({
      where: { id: requestId },
      include: { user: true } // Include user to get current balance
    });

    if (!request) {
      throw new Error('Balance request not found');
    }

    // Check if request is already processed
    if (request.status !== 'PENDING') {
      throw new Error(`Balance request is already ${request.status.toLowerCase()}`);
    }

    // Get user's current balance (it won't change on rejection)
    const currentBalance = request.user.balance;

    // Update the request status and store balance history
    const updatedRequest = await prisma.balanceRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        previousBalance: currentBalance,
        closingBalance: currentBalance
      }
    });

    return updatedRequest;
  } catch (error) {
    throw new Error(`Failed to reject balance request: ${error.message}`);
  }
}

/**
 * Get all transactions
 */
export async function getAllTransactions({ days } = {}) {
  try {
    let where = {};
    if (days) {
      const date = new Date();
      date.setDate(date.getDate() - days);
      where.createdAt = { gte: date };
    }

    const transactions = await prisma.transactions.findMany({
      where,
      select: {
        id: true,
        amount: true,
        transactionType: true,
        createdAt: true,
        transactionStatus: true,
        sender: {
          select: {
            phoneNumber: true,
            email: true
          }
        },
        beneficiary: {
          select: {
            accountHolderName: true,
            accountNumber: true
          }
        },
        upiBeneficiary: {
          select: {
            accountHolderName: true,
            upiId: true
          }
        },
        dmtBeneficiary: {
          select: {
            accountHolderName: true,
            accountNumber: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return transactions;
  } catch (error) {
    throw new Error(`Failed to get transactions: ${error.message}`);
  }
}

/**
 * Get all transaction charges
 */
export async function getTransactionCharges() {
  try {
    const charges = await prisma.transactionCharge.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return charges;
  } catch (error) {
    throw new Error(`Failed to get transaction charges: ${error.message}`);
  }
}

/**
 * Update transaction charge
 */
export async function updateTransactionCharge(chargeId, data) {
  try {
    const charge = await prisma.transactionCharge.update({
      where: { id: chargeId },
      data
    });

    return charge;
  } catch (error) {
    throw new Error(`Failed to update transaction charge: ${error.message}`);
  }
}

/**
 * Create transaction charge
 */
export async function createTransactionCharge({ minAmount, maxAmount, charge }) {
  try {
    // Check for overlapping ranges
    const existingCharges = await prisma.transactionCharge.findMany();
    const overlap = existingCharges.some(tier => 
      (minAmount >= tier.minAmount && minAmount <= tier.maxAmount) || 
      (maxAmount >= tier.minAmount && maxAmount <= tier.maxAmount) ||
      (minAmount <= tier.minAmount && maxAmount >= tier.maxAmount)
    );
    
    if (overlap) {
      throw new Error('New charge tier overlaps with existing tiers');
    }
    const newCharge= await prisma.transactionCharge.create({
      data: {
        minAmount,
        maxAmount,
        charge
      }
    });

    return newCharge;
  } catch (error) {
    throw new Error(`Failed to create transaction charge: ${error.message}`);
  }
};

export async function updatePermissions(userId, permissions) {
  console.log("updatePermissions function reached for userId:", userId);
  console.log("Permissions received:", permissions);
  try {
    const { imps, upi, dmt } = permissions;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        impsPermissions: imps,
        upiPermissions: upi,
        dmtPermissions: dmt,
      },
    });

    console.log("User permissions updated in DB:", updatedUser.id);
    return updatedUser;
  } catch (error) {
    console.error("Error in updatePermissions:", error);
    throw new Error(`Failed to update permissions: ${error.message}`);
  }
}

/**
 * Deduct user balance and record the adjustment
 */
export async function deductUserBalance(userId, adminId, amount, reason) {
  try {
    if (amount <= 0) {
      throw new Error('Deduction amount must be positive');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Get user's current balance
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { balance: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const previousBalance = user.balance;

      // 2. Validate if user has sufficient balance (optional, depending on business logic)
      if (previousBalance < amount) {
        throw new Error('Insufficient balance for deduction');
      }

      // 3. Deduct amount from user's balance
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          balance: {
            decrement: amount,
          },
        },
      });

      const closingBalance = updatedUser.balance;

      // 4. Record the balance adjustment
      await tx.balanceAdjustment.create({
        data: {
          userId: userId,
          adminId: adminId,
          amount: amount,
          type: 'DEDUCTION', // Using the AdjustmentType enum
          reason: reason,
          previousBalance: previousBalance,
          closingBalance: closingBalance,
        },
      });

      return updatedUser; // Or return the balance adjustment record if preferred
    });
  } catch (error) {
    throw new Error(`Failed to deduct user balance: ${error.message}`);
  }
}

/**
 * Get all verified users
 */
export async function getVerifiedUsers() {
  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { userType: 'VERIFIED' },
          { userType: 'PROPRIETOR_VERIFIED' },
          { userType: 'COMPANY_VERIFIED' },
        ],
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        balance: true,
        userType: true,
        aadhaarNumber: true,
        panCardNumber: true,
        companyName: true,
        companyCIN: true,
        directors: true,
        documents: true,
        officePhotos: true,
        impsPermissions: true,
        upiPermissions: true,
        dmtPermissions: true,
        _count: {
          select: {
            sentTransactions: true,
          },
        },
      },
    });

    const usersWithTransactionData = await Promise.all(
      users.map(async (user) => {
        const totalTransactionValue = await prisma.transactions.aggregate({
          _sum: {
            amount: true,
          },
          where: {
            senderId: user.id,
          },
        });

        return {
          ...user,
          transactionCount: user._count.sentTransactions,
          totalTransactionValue: totalTransactionValue._sum.amount || 0,
        };
      })
    );

    return usersWithTransactionData;
  } catch (error) {
    throw new Error(`Failed to get verified users: ${error.message}`);
  }
}