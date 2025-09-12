import { AeronpayCreditPayment } from '../../../controllers/aeronpayController';
import { NextResponse } from 'next/server';

export async function POST(req) {
  return AeronpayCreditPayment(req, NextResponse);
}
