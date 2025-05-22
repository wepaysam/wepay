import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

export async function GET(request) {
  try {

    console.log("DATABASE_URL =>", process.env.DATABASE_URL);

    // Get the phone number from the query parameters
    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get('phoneNumber');
    
    if (!phoneNumber) {
      return NextResponse.json(
        { message: 'Phone number is required' },
        { status: 400 }
      );
    }
    
    console.log('Checking status for phone number:', phoneNumber);
    
    // Check if a user with this phone number exists
    const user = await prisma.user.findUnique({
      where: { phoneNumber },
      select: { id: true, userType: true }
    });
    
    console.log('User found:', user);
    
    if (!user) {
      return NextResponse.json({ 
        exists: false,
        status: 'NOT_FOUND'
      });
    }
    
    return NextResponse.json({
      exists: true,
      status: user.userType // Will be 'VERIFIED', 'UNVERIFIED', or 'ADMIN'
    });
    
  } catch (error) {
    console.error('Error in check-status:', error);
    
    // Check if it's a Prisma error
    if (error.code) {
      console.error('Prisma error code:', error.code);
    }
    
    return NextResponse.json(
      { 
        message: 'Error checking user status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
