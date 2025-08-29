import { NextResponse } from 'next/server';
import { getBalances } from '../../../controllers/dmtController';

export async function POST(req) {
  try {
    const balances = await getBalances();
    return NextResponse.json(balances, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
  }
}
