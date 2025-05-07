import { verifyKyc } from '../../../controllers/userController';
import { adminAuthMiddleware } from '../../../middleware/authMiddleware';

export async function POST(request) {
  try {
    // Apply admin auth middleware
    const user = await adminAuthMiddleware(request);
    
    if (!user) {
      return new Response(
        JSON.stringify({ message: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get request body
    const body = await request.json();
    const { userId, isVerified } = body;

    if (!userId) {
      return new Response(
        JSON.stringify({ message: 'User ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update KYC status
    const updatedUser = await verifyKyc(userId, isVerified);

    return new Response(
      JSON.stringify({ 
        message: `KYC ${isVerified ? 'verified' : 'rejected'} successfully`, 
        user: updatedUser 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('KYC verification error:', error);
    return new Response(
      JSON.stringify({ message: 'Failed to update KYC status', error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
