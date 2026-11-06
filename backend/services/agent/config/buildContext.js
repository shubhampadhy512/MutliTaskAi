import { getMemory } from "./memorize.js";

// Returns { summaryText, pastMessages } for any agent
export const buildContext = async (conversationId) => {
    let history = [];
    try {
        history = await getMemory(conversationId);
    } catch (err) {
        console.error("Memory failed:", err.message);
    }

    const summary = history.find((m) => m.role === "summarized");

    const pastMessages = history
        .filter((m) => m.role !== "summarized")
        .map((m) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.message,
        }));

    return {
        summaryText: summary ? summary.message : null,
        pastMessages,
    };
};