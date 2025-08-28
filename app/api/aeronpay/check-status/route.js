import { NextResponse } from 'next/server';
import { checkStatus } from '../../../controllers/aeronpayController';

export async function POST(req) {
  return checkStatus(req);
}
