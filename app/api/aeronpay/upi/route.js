import { upiPayment } from '../../../controllers/aeronpayController';

export async function POST(request) {
  return upiPayment(request);
}