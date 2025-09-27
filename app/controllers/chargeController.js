
import prisma from '../lib/prisma';

/**
 * Get all transaction charges
 */
export async function getAllCharges() {
  try {
    const charges = await prisma.transactionCharge.findMany({
      orderBy: { minAmount: 'asc' }
    });

    // Convert Prisma Decimal 'charge' to number for frontend compatibility
    const formattedCharges = charges.map(chargeItem => ({
      ...chargeItem,
      charge: chargeItem.charge && typeof chargeItem.charge.toNumber === 'function' 
                ? chargeItem.charge.toNumber() 
                : (chargeItem.charge === null ? 0 : chargeItem.charge) // Handle null or already number
    }));

    return formattedCharges;
  } catch (error) {
    throw new Error(`Failed to get transaction charges: ${error.message}`);
  }
}
