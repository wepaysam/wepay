
import { sevapayPayment } from "../../../controllers/sevapayController";

export async function POST(req, res) {
    return sevapayPayment(req, res);
}

