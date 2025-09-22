
import { sevapayPayment } from "../../../controllers/sevapayController";
import { verifiedUserMiddleware } from "../../../middleware/authMiddleware";

export async function POST(req, res) {
    const authError = await verifiedUserMiddleware(req);
    if (authError) return authError;
    return sevapayPayment(req, res);
}

