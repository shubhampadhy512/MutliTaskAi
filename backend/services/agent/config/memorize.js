import redis from "../../../shared/redis/redis.js";
import { summarizeMemory } from "./SummarizerLLM.js";
import { getMessage } from "../utils/previousMessage.js";

const MAX_MESSAGES = 20;   // summarize when the list reaches this size
const KEEP_LAST = 4;       // keep the last 4 messages as exact text
const REBUILD_LAST = 10;   // how many messages to load from MongoDB
const EXPIRE_SECONDS = 60 * 60 * 24 * 7; // 7 days

// Load the last messages from MongoDB (through the chat service)
const loadFromDatabase = async (conversationId) => {
    let msgs = await getMessage(conversationId);
    if (!Array.isArray(msgs) || msgs.length === 0) return [];

    // The controller already saved the CURRENT prompt in MongoDB.
    // Remove it, or the AI sees it twice.
    if (msgs[msgs.length - 1].role === "user") {
        msgs = msgs.slice(0, -1);
    }

    msgs = msgs.slice(-REBUILD_LAST);

    // The first message must be from the user (Gemini needs this)
    while (msgs.length && msgs[0].role !== "user") {
        msgs = msgs.slice(1);
    }

    return msgs.map((m) => ({
        role: m.role === "user" ? "user" : "ai",
        message: String(m.content || "").slice(0, 3000),
    }));
};

export const getMemory = async (conversationId) => {
    const key = `message:${conversationId}`;

    const cached = await redis.lrange(key, 0, -1);
    let messages = cached.map((msg) => JSON.parse(msg));

    // Redis is empty: rebuild from MongoDB
    if (messages.length === 0) {
        messages = await loadFromDatabase(conversationId);

        if (messages.length > 0) {
            await redis.rpush(key, ...messages.map((m) => JSON.stringify(m)));
            await redis.expire(key, EXPIRE_SECONDS);
        }
    }

    if (messages.length < MAX_MESSAGES) {
        return messages;
    }

    // Too many messages: summary of old ones + keep the last 4
    const oldMessages = messages.slice(0, -KEEP_LAST);
    const recentMessages = messages.slice(-KEEP_LAST);

    const summary = await summarizeMemory(oldMessages);
    const summaryItem = { role: "summarized", message: summary };

    await redis.del(key);
    await redis.rpush(
        key,
        JSON.stringify(summaryItem),
        ...recentMessages.map((m) => JSON.stringify(m))
    );
    await redis.expire(key, EXPIRE_SECONDS);

    return [summaryItem, ...recentMessages];
};

export const addToMemory = async (conversationId, role, message) => {
    const key = `message:${conversationId}`;

    await redis.rpush(key, JSON.stringify({ role, message }));
    await redis.expire(key, EXPIRE_SECONDS);
};