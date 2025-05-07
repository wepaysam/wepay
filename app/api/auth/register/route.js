import { NextResponse } from 'next/server';
import { registerUser } from '../../../controllers/userController';

export async function POST(request) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.phoneNumber) {
      return NextResponse.json(
        { message: 'Phone number is required' },
        { status: 400 }
      );
    }
    
    const result = await registerUser(data);
    
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || 'Registration failed' },
      { status: 400 }
    );
  }
}
