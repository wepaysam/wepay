import { NextResponse } from 'next/server';
import { getBalances } from '../../controllers/sevapayController';

export async function GET() {
    try {
        const { vishubhBalance, kotalBalance } = await getBalances();
        return NextResponse.json({ vishubhBalance, kotalBalance });
    } catch (error) {
        console.error("Error fetching balances:", error);
        return NextResponse.json({ message: 'Failed to fetch balances', error: error.message }, { status: 500 });
    }
}