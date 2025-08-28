import { upiPayment } from '../../../controllers/aeronpayController';

export async function POST(request) {
  const authError = await authMiddleware(request);
      if (authError) return authError;
  return upiPayment(request);
}