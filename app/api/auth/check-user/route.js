import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

export async function GET(request) {
  try {
    // Get the phone number from the query parameters
    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get('phoneNumber');
    
    if (!phoneNumber) {
      return NextResponse.json(
        { message: 'Phone number is required' },
        { status: 400 }
      );
    }
    
    // Check if a user with this phone number exists
    const existingUser = await prisma.user.findUnique({
      where: { phoneNumber }
    });
    
    return NextResponse.json({ 
      exists: !!existingUser 
    });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || 'Error checking user' },
      { status: 500 }
    );
  }
}
