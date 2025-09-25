import { getVerifiedUsers } from '../../../controllers/adminController';
import { adminAuthMiddleware } from '../../../middleware/authMiddleware';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const authError = await adminAuthMiddleware(request);
    if (authError) return authError;
    // console.log("Fetching verified a");
    const users = await getVerifiedUsers();
    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}