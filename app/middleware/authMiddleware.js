import { verifyToken } from '../utils/auth';
import { NextResponse } from 'next/server';

export async function authMiddleware(req) {
  try {
    // First, try to get token from Authorization header
    let token = req.headers.get('Authorization')?.split(' ')[1];
    console.log("Token from header:", token);

    // If no token in header, try to extract from cookies
    if (!token && req.cookies) {
      const cookieHeader = req.headers.get('cookie');
      if (cookieHeader) {
        const tokenMatch = cookieHeader.match(/token=([^;]+)/);
        if (tokenMatch) {
          token = tokenMatch[1];
        }
      }
    }

    if (!token) {
      return NextResponse.json(
        { message: 'Authentication token is required' },
        { status: 401 } 
      );
    }
    
    // Verify token
    const decoded = verifyToken(token);
    
    // Add user data to request
    req.user = decoded;
    
    return null; // Middleware passes, continue to handler
  } catch (error) {
    console.error('Authentication middleware error:', error.message);
    return NextResponse.json(
      { message: 'Authentication failed', error: error.message },
      { status: 401 }
    );
  }
}

export async function adminAuthMiddleware(req) {
  const authError = await authMiddleware(req);
  
  if (authError) return authError;
  
  // Check if user is admin
  if (req.user.userType !== 'ADMIN') {
    return NextResponse.json(
      { message: 'Unauthorized: Admin access required' },
      { status: 403 }
    );
  }
  
  return null; // Middleware passes, continue to handler
}

export async function verifiedUserMiddleware(req) {
  const authError = await authMiddleware(req);
  
  if (authError) return authError;
  
  // Check if user is verified
  if (req.user.userType !== 'VERIFIED' && req.user.userType !== 'PROPRIETOR_VERIFIED'  && req.user.userType !== 'COMPANY_VERIFIED' && req.user.userType !== 'ADMIN') {
    return NextResponse.json(
      { message: 'Unauthorized: Verified user access required' },
      { status: 403 }
    );
  }
  
  return null; // Middleware passes, continue to handler
}
