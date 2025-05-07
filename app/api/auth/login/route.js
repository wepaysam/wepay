import { NextResponse } from 'next/server';
import { loginUser } from '../../../controllers/userController';

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
    
    const result = await loginUser(data);
    
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { message: error.message || 'Login failed' },
      { status: 401 }
    );
  }
}
