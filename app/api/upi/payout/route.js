import { p2iUpiPayout } from '../../../controllers/upiController';
import { authMiddleware } from '../../../middleware/authMiddleware';

export async function POST(req) {
    const authResult = await authMiddleware(req);
    if (authResult) return authResult;
    // At this point, request.user contains the decoded token data
    // const userId = request.user.id;
    return p2iUpiPayout(req);
}
