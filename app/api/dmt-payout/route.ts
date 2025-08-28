import { dmtPayment } from '../../controllers/dmtController';
import { authMiddleware } from '../../middleware/authMiddleware';

export async function POST(request: Request) {
  const authError = await authMiddleware(request);
      if (authError) return authError;
  return dmtPayment(request);
}
