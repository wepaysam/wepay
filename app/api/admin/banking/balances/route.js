import { NextResponse } from 'next/server';
import { adminAuthMiddleware } from '../../../../middleware/authMiddleware';
import { getBalances } from '../../../../controllers/sevapayController';
import { getBalances as getDmtBalancesController } from '../../../../controllers/dmtController'; // Renamed to avoid conflict
import { AeronpayBalance as getAeronpayBalanceController } from '../../../../controllers/aeronpayController'; // Renamed to avoid conflict

export async function GET(request) {
  try {
    // Check if user is admin
    const authError = await adminAuthMiddleware(request);
    if (authError) return authError;

    // Fetch Vishubh and Kotal balances
    const { vishubhBalance } = await getBalances();

    let dmtBalance = 0;
    let aeronpayBalance = 0;

    // Fetch DMT balance
    try {
      const dmtResponse = await getDmtBalancesController(); // Call the renamed controller function
      if (dmtResponse && dmtResponse.data && dmtResponse.data.currentBalance !== undefined) {
        dmtBalance = dmtResponse.data.currentBalance;
      }
    } catch (dmtError) {
      console.error("Error fetching DMT balance:", dmtError.message);
    }

    // Fetch Aeronpay (UPI) balance
    try {
      // Call the AeronpayBalance controller function directly
      const aeronpayNextResponse = await getAeronpayBalanceController(request); // Pass the request object
      const aeronpayData = await aeronpayNextResponse.json(); // Parse the NextResponse
      if (aeronpayNextResponse.ok && aeronpayData && aeronpayData.available_balance !== undefined) {
        aeronpayBalance = aeronpayData.available_balance;
      }
    } catch (aeronpayError) {
      console.error("Error fetching Aeronpay balance:", aeronpayError.message);
    }

    return NextResponse.json({
      vishubhBalance,
      dmtBalance,
      aeronpayBalance,
    });
  } catch (error) {
    console.error("Error fetching admin banking balances:", error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch admin banking balances' },
      { status: 500 }
    );
  }
}
