const db = require("../db/db");

async function paymentMiddleware(req, res, next) {
    try {
        const subscriptions = await db.query(
            "SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY expiry DESC LIMIT 1",
            [req.user.id]
        );

        const subscription = subscriptions[0];
        if (!subscription) {
            return res.status(403).json({ status: 403, message: "No subscription found" });
        }

        const now = new Date();
        const expiredAt = new Date(subscription.expiry);
        if (now > expiredAt) {
            return res.status(403).json({ status: 403, message: "Subscription expired" });
        }

        next();
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: 500, message: "An error Occured" });
    }
}

module.exports = paymentMiddleware;
