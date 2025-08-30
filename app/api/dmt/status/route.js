import { dmtStatus } from "../../../controllers/dmtController";

export async function POST(req) {
  return dmtStatus(req);
}
