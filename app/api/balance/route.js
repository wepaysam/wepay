import { NextResponse } from 'next/server';
import prisma from '../../lib/prisma';

export async function GET() {
  try {
    const balance = await prisma.balance.findFirst();
    if (!balance) {
      // If no balance record exists, return default values
      return NextResponse.json({ vishubhBalance: 0, kotalBalance: 0 });
    }
    return NextResponse.json(balance);
  } catch (error) {
    console.error("Error fetching balance:", error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
