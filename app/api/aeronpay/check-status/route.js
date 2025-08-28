import { NextResponse } from 'next/server';
import { checkStatus } from '../../../controllers/aeronpayController';
import { authMiddleware } from '../../../middleware/authMiddleware';

export async function POST(req) {
  const authResult = await authMiddleware(req);
  if (authResult) return authResult;
  return checkStatus(req);
}
