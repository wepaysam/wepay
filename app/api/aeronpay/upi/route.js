import { upiPayment } from '../../../controllers/aeronpayController';
import { authMiddleware } from '../../../middleware/authMiddleware';

export async function POST(request) {
  const authResult = await authMiddleware(request);
  if (authResult) return authResult;
  return upiPayment(request);
}