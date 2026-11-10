import { useCredit } from "../utils/credits.js";

export const uploadLimit = async (req, res, next) => {
    const files = req.files || [];
    if (files.length === 0) return next(); // normal chat is not touched

    let userId = req.headers["x-user-id"];
    if (!userId) {
        console.warn("uploadLimit: x-user-id missing, using conversationId");
        userId = req.body?.conversationId || "unknown";
    }

    const c = await useCredit(userId, "file", files.length);
    if (!c.ok) {
        return res.status(403).json({
            message: `File limit reached (${c.limit} files per day). Try again tomorrow.`,
        });
    }
    next();
};