import redis from "../../../shared/redis/redis.js";

const SEVEN_DAYS = 60 * 60 * 24 * 7;

export async function saveLastDoc(conversationId, type, data) {
    try {
        const key = `doc:${type}:${conversationId}`;
        await redis.set(key, JSON.stringify(data));
        await redis.expire(key, SEVEN_DAYS);
    } catch (err) {
        console.log("saveLastDoc failed:", err.message);
    }
}

export async function getLastDoc(conversationId, type) {
    try {
        const raw = await redis.get(`doc:${type}:${conversationId}`);
        return raw ? JSON.parse(raw) : null;
    } catch (err) {
        console.log("getLastDoc failed:", err.message);
        return null;
    }
}