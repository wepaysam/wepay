import { AeronpaycreditcardVerification } from '../../../controllers/aeronpayController';
import { NextResponse } from 'next/server';

export async function POST(req) {
  return AeronpaycreditcardVerification(req, NextResponse);
}
