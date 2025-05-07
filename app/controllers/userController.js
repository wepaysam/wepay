import prisma from '../lib/prisma';
import jwt from 'jsonwebtoken';
import { generateToken } from '../utils/auth';

// Use the same JWT_SECRET as in auth.js
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

export async function registerUser(data) {
  try {
    const { phoneNumber, email, aadhaarNumber, panCardNumber, aadhaarCardUrl, panCardUrl } = data;

    // Check if user already exists with phone number
    const existingUser = await prisma.user.findUnique({
      where: { phoneNumber }
    });

    if (existingUser) {
      throw new Error('User already exists with this phone number');
    }

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        phoneNumber,
        email,
        userType: 'UNVERIFIED',
        aadhaarNumber,
        panCardNumber,
        aadhaarCardUrl,
        panCardUrl,
        isKycVerified: false // KYC will be verified later by admin
      }
    });

    // Generate JWT token
    const token = generateToken(newUser);

    return {
      message: 'User registered successfully',
      user: newUser,
      token
    };
  } catch (error) {
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
