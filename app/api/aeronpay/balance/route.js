import { NextResponse } from 'next/server';
import { AeronpayBalance } from '../../../controllers/aeronpayController';

export async function POST(req) {
    return AeronpayBalance(req);
}
