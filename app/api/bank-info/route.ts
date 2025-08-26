import { NextResponse } from 'next/server';
import prisma from '../../lib/prisma';

export async function GET() {
  try {
    const banks = await prisma.bankInfo.findMany({
      orderBy: {
        name: 'asc',
      },
    });
    return NextResponse.json({ banks }, { status: 200 });
  } catch (error) {
    console.error('Error fetching bank info:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}