import redis from "../../../shared/redis/redis.js";

// ===== CHANGE THESE NUMBERS =====
// POOL = total per day for ALL users together
const POOL = { image: 200, pdf: 300, ppt: 150, file: 300 };
// MAX = the most one user can get per day (when there are few users)
const MAX_PER_USER = { image: 5, pdf: 5, ppt: 3, file: 10 };
const MIN_PER_USER = 1;
// =================================

const DAY_SECONDS = 2 * 24 * 60 * 60;
const today = () => new Date().toISOString().slice(0, 10);

// Count this user as "active today"
export async function registerUser(userId) {
    try {
        const key = `credits:users:${today()}`;
        await redis.sadd(key, String(userId));
        await redis.expire(key, DAY_SECONDS);
    } catch (e) {
        console.error("registerUser failed:", e.message);
    }
}

// How many credits each user gets today for this feature
export async function getLimit(feature) {
    const users = Math.max(1, await redis.scard(`credits:users:${today()}`));
    const share = Math.floor(POOL[feature] / users);
    return Math.max(MIN_PER_USER, Math.min(MAX_PER_USER[feature], share));
}

// Use credits. Returns { ok, limit, used }. If Redis fails, the user is NOT blocked.
export async function useCredit(userId, feature, amount = 1) {
    try {
        const limit = await getLimit(feature);
        const key = `credits:${today()}:${userId}:${feature}`;

        const used = await redis.incrby(key, amount);
        if (used === amount) await redis.expire(key, DAY_SECONDS);

        if (used > limit) {
            await redis.decrby(key, amount); // give back, request is rejected
            return { ok: false, limit, used: used - amount };
        }
        return { ok: true, limit, used };
    } catch (e) {
        console.error("useCredit failed:", e.message);
        return { ok: true, limit: 0, used: 0 };
    }
}