import prisma from '../lib/prisma';
import jwt from 'jsonwebtoken';
import { generateToken } from '../utils/auth';

// Use the same JWT_SECRET as in auth.js
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

export async function registerUser(data) {
  const {
    accountType,
    email,
    name,
    phoneNumber,
    aadhaarNumber,
    panCardNumber,
    companyName,
    companyCIN,
    directors,
    officePhotos,      // Assumes frontend provides: string[]
    companyDocumentUrls,  // Assumes frontend provides: { url: string, type: string }[]
  } = data;

  if (!accountType || !name || !phoneNumber) {
    throw new Error('Account type, name, and phone number are required.');
  }

  const existingUser = await prisma.user.findUnique({
    where: { phoneNumber },
  });

  if (existingUser) {
    throw new Error('User already exists with this phone number');
  }

  try {
    const newUser = await prisma.$transaction(async (tx) => {
      let createdUser;

      if (accountType === 'PROPRIETOR') {
        createdUser = await tx.user.create({
          data: {
            phoneNumber,
            email,
            fullName: name,
            userType: 'PROPRIETOR_UNVERIFIED',
            aadhaarNumber,
            panCardNumber,
          },
        });

        if (officePhotos && officePhotos.length > 0) {
          await tx.officePhoto.createMany({
            data: officePhotos.map((url) => ({
              url,
              userId: createdUser.id,
            })),
          });
        }
      } else if (accountType === 'COMPANY') {
        createdUser = await tx.user.create({
          data: {
            phoneNumber,
            email,
            fullName: name, // Contact Person Name
            userType: 'COMPANY_UNVERIFIED',
            companyName,
            companyCIN,
          },
        });

        if (directors && directors.length > 0) {
          await tx.director.createMany({
            data: directors.map((dir) => ({
              ...dir,
              userId: createdUser.id,
            })),
          });
        }

        if (companyDocumentUrls && companyDocumentUrls.length > 0) {
          await tx.companyDocument.createMany({
            data: companyDocumentUrls.map((doc) => ({
              url: doc.url,
              documentType: doc.type,
              userId: createdUser.id,
            })),
          });
        }

        if (officePhotos && officePhotos.length > 0) {
          await tx.officePhoto.createMany({
            data: officePhotos.map((url) => ({
              url,
              userId: createdUser.id,
            })),
          });
        }
      } else {
        throw new Error('Invalid account type specified');
      }

      return createdUser;
    });

    const token = generateToken(newUser);

    return {
      message: 'User registered successfully',
      user: newUser,
      token,
    };
  } catch (error) {
    console.error("Registration failed:", error);
    throw new Error(`Registration failed: ${error.message}`);
  }
}

export async function loginUser(data) {
  try {
    const { phoneNumber } = data;

    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }

    // Find user by phone number
    const user = await prisma.user.findUnique({
      where: { phoneNumber }
    });

    if (!user) {
      throw new Error('User not found with this phone number');
    }

    // In a real implementation, we would verify OTP here
    // For now, we're assuming OTP is verified in the frontend

    // Create JWT token with the same secret as auth.js
    const token = jwt.sign(
      { id: user.id, phoneNumber: user.phoneNumber, userType: user.userType },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    console.log('Login successful for user:', user.id, '- Token created with length:', token.length);

    return { 
      token,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        userType: user.userType
      }
    };
  } catch (error) {
    throw new Error(`Login failed: ${error.message}`);
  }
}

export async function getUserProfile(userId) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  } catch (error) {
    throw new Error(`Failed to get user profile: ${error.message}`);
  }
}

export async function updateUserType(userId, userType) {
  try {
    // Update user type
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { userType }
    });

    return updatedUser;
  } catch (error) {
    throw new Error(`Failed to update user type: ${error.message}`);
  }
}

export async function verifyKyc(userId, isVerified) {
  try {
    // Update KYC verification status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isKycVerified: isVerified }
    });

    return updatedUser;
  } catch (error) {
    throw new Error(`Failed to update KYC status: ${error.message}`);
  }
}



export async function checkUserExists(phoneNumber) {
  try {
    const user = await prisma.user.findUnique({
      where: { phoneNumber },
    });
    return { exists: !!user };
  } catch (error) {
    console.error('Error checking user existence:', error);
    throw new Error('Could not check user existence');
  }
}
// In `userController.js`

export async function getAllUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        userType: true,
        isKycVerified: true,
        createdAt: true,
      },
    });
    return users;
  } catch (error) {
    console.error('Error fetching all users:', error);
    throw new Error('Could not fetch users');
  }
}
// In `userController.js`

export async function getUnverifiedUsers() {
  try {
    const users = await prisma.user.findMany({
      where: {
        isKycVerified: false,
      },
      include: {
        directors: true,
        companyDocuments: true,
        officePhotos: true,
      },
    });
    return users;
  } catch (error) {
    console.error('Error fetching unverified users:', error);
    throw new Error('Could not fetch unverified users');
  }
}
// In `userController.js`

export async function verifyUser(userId) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    let newUserType;
    if (user.userType === 'PROPRIETOR_UNVERIFIED') {
      newUserType = 'PROPRIETOR_VERIFIED';
    } else if (user.userType === 'COMPANY_UNVERIFIED') {
      newUserType = 'COMPANY_VERIFIED';
    } else {
      // User is already verified or has a different status
      return user;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isKycVerified: true,
        userType: newUserType,
      },
    });

    return updatedUser;
  } catch (error) {
    console.error(`Error verifying user ${userId}:`, error);
    throw new Error('Could not verify user');
  }
}
// In `userController.js`

export async function getUserDashboardData(userId) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        balance: true,
        userType: true,
        isKycVerified: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const totalTransactions = await prisma.transaction.count({
      where: { userId },
    });

    const successfulTransactions = await prisma.transaction.count({
      where: { userId, status: 'SUCCESS' },
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthlyPayouts = await prisma.transaction.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        userId,
        status: 'SUCCESS',
        createdAt: {
          gte: startOfMonth,
        },
      },
    });

    return {
      ...user,
      totalTransactions,
      successfulTransactions,
      monthlyPayouts: monthlyPayouts._sum.amount || 0,
    };
  } catch (error) {
    console.error(`Error fetching dashboard data for user ${userId}:`, error);
    throw new Error('Could not fetch dashboard data');
  }
}
// In `userController.js`

export async function getAdminDashboardData() {
  try {
    const totalUsers = await prisma.user.count();
    const totalTransactions = await prisma.transaction.count();
    const totalVolume = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { status: 'SUCCESS' },
    });
    const pendingBalanceRequests = await prisma.balanceRequest.count({
      where: { status: 'PENDING' },
    });

    // Recent 5 transactions
    const recentTransactions = await prisma.transaction.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { fullName: true } } },
    });

    return {
      totalUsers,
      totalTransactions,
      totalVolume: totalVolume._sum.amount || 0,
      pendingBalanceRequests,
      recentTransactions,
    };
  } catch (error) {
    console.error('Error fetching admin dashboard data:', error);
    throw new Error('Could not fetch admin dashboard data');
  }
}
// In `userController.js`

export async function getAllTransactions() {
  try {
    const transactions = await prisma.transaction.findMany({
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return transactions;
  } catch (error) {
    console.error('Error fetching all transactions:', error);
    throw new Error('Could not fetch transactions');
  }
}
// In `userController.js`

export async function getTransactionCharges() {
  try {
    const charges = await prisma.transactionCharges.findFirst({});
    // If no charges are set, return default values
    if (!charges) {
      return {
        id: null, // Or a temporary ID
        payoutPercentage: 0.5, // Default percentage
        payoutFixed: 5, // Default fixed charge
        payoutMin: 10, // Default min charge
        p2iPercentage: 0.4,
        p2iFixed: 4,
        p2iMin: 8,
      };
    }
    return charges;
  } catch (error) {
    console.error('Error fetching transaction charges:', error);
    throw new Error('Could not fetch transaction charges');
  }
}

export async function updateTransactionCharges(data) {
  const {
    id,
    payoutPercentage,
    payoutFixed,
    payoutMin,
    p2iPercentage,
    p2iFixed,
    p2iMin,
  } = data;

  try {
    let updatedCharges;
    if (id) {
      // If an ID is provided, update the existing record
      updatedCharges = await prisma.transactionCharges.update({
        where: { id },
        data: {
          payoutPercentage,
          payoutFixed,
          payoutMin,
          p2iPercentage,
          p2iFixed,
          p2iMin,
        },
      });
    } else {
      // Otherwise, create a new record
      // This assumes you only ever want one record for charges.
      // You might want to clear existing records first if that's the case.
      await prisma.transactionCharges.deleteMany({});
      updatedCharges = await prisma.transactionCharges.create({
        data: {
          payoutPercentage,
          payoutFixed,
          payoutMin,
          p2iPercentage,
          p2iFixed,
          p2iMin,
        },
      });
    }
    return updatedCharges;
  } catch (error) {
    console.error('Error updating transaction charges:', error);
    throw new Error('Could not update transaction charges');
  }
}