import { dmtPayment } from '../../controllers/dmtController';

export async function POST(request: Request) {
  return dmtPayment(request);
}
