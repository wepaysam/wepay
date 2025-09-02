import { AeronpayUPIVerification } from "../../../controllers/aeronpayController";
import { NextResponse } from "next/server";
import { authMiddleware } from "../../../middleware/authMiddleware";

export async function POST(request) {
  try {
    const authResult = await authMiddleware(request);
    if (authResult) return authResult;
    return await AeronpayUPIVerification(request);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
