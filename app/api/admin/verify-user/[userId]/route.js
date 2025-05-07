import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '../../../../lib/prisma';
import { verifyUser } from '../../../../controllers/adminController';

// Middleware to check if user is admin
async function isAdmin(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { userType: true }
    });
    
    return user && user.userType === 'ADMIN';
  } catch (error) {
    return false;
  }
}

export async function PUT(request, { params }) {
  try {
    const { userId } = params;
    
    // Check if user is admin
    const adminAccess = await isAdmin(request);
    
    if (!adminAccess) {
      return NextResponse.json(
        { message: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }
    
    // Verify the user
    const user = await verifyUser(userId);
    
    return NextResponse.json({ 
      message: 'User verified successfully',
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        userType: user.userType
      }
    });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || 'Failed to verify user' },
      { status: 500 }
    );
  }
}
