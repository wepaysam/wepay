import { getTransactionCharges, createTransactionCharge } from '../../../controllers/adminController';
import { adminAuthMiddleware } from '../../../middleware/authMiddleware';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const authError = await adminAuthMiddleware(request);
    if (authError) return authError;
    const charges = await getTransactionCharges();
    return NextResponse.json(charges);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 

export async function POST(request) {
  try {
    const authError = await adminAuthMiddleware(request);
    const { minAmount, maxAmount, charge } = await request.json();
    if (authError) return authError;
     // Validate required fields
    if (!minAmount || !maxAmount || !charge) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields: minAmount, maxAmount, and charge are required'
      }, { status: 400 });  
    }
     // Validate numeric values and relationships
     const min = parseFloat(minAmount);
     const max = parseFloat(maxAmount);
     const chargeAmount = parseFloat(charge);
     
     if (isNaN(min) || isNaN(max) || isNaN(chargeAmount)) {
       return res.status(400).json({
         success: false,
         message: 'All values must be valid numbers'
       }, { status: 400 });
     }
     
     if (min >= max) {
       return NextResponse.json({
         success: false,
         message: 'minAmount must be less than maxAmount'
       }, { status: 400 });
     }
     
     if (chargeAmount < 0) {
       return NextResponse.json({
         success: false,
         message: 'Charge amount cannot be negative'
       }, { status: 400 });
     }
     
    //  return NextResponse.json({
    //   success: false,
    //   message: 'Transaction charge created successfully'
    // }, { status: 56 });

    const newCharge = await createTransactionCharge({ minAmount, maxAmount, charge });
    return NextResponse.json(newCharge);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
