

import { sevapayStatus } from "../../../controllers/sevapayController";

export async function POST(req, res) {
    return sevapayStatus(req, res);
}

