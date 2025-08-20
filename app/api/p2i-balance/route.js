import { NextResponse } from 'next/server';
import { getP2IBalance } from '../../controllers/p2iController';

export async function GET() {
    try {
        const p2iBalance = await getP2IBalance();
        return NextResponse.json({ p2iBalance });
    } catch (error) {
        console.error("Error fetching P2I balance:", error);
        return NextResponse.json({ message: 'Failed to fetch P2I balance', error: error.message }, { status: 500 });
    }
}