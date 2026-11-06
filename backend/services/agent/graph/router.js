import { getModel } from "../config/LLmModels.js";
import { buildContext } from "../config/buildContext.js";

const VALID_AGENTS = ["chat", "search", "coding", "image", "pdf", "ppt"];

// Clear image requests
const IMAGE_VERB_NOUN =
    /\b(generate|create|make|draw|design|paint|render|produce)\b[^.?!\n]{0,80}\b(image|picture|photo|poster|illustration|wallpaper|artwork|painting|greeting card|wishes card|invitation card|logo)\b/i;
const IMAGE_OF = /\b(image|picture|photo|painting|illustration)\s+of\b/i;
const IMAGE_WORD =
    /\b(image|picture|photo|poster|illustration|wallpaper|artwork|painting|card|logo|draw|drawing)\b/i;

// New code request
const CODE_ACTION = /\b(build|create|make|write|develop|code|fix|debug)\b/i;
const CODE_THING =
    /\b(game|app|website|web page|webpage|page|calculator|component|script|program|html|css|javascript|python|react|todo|form|landing page|function|api|bug)\b/i;

// Words that mean the user wants another agent
const OTHER_AGENT =
    /\b(search|news|latest|weather|pdf|ppt|powerpoint|presentation|slides|image|picture|photo|poster|logo)\b/i;

function getText(content) {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
        return content.map((p) => (typeof p === "string" ? p : p.text || "")).join("");
    }
    return String(content ?? "");
}

const ROUTER_PROMPT = `Classify the user's LAST message into exactly one agent. Reply with ONE word only.

chat: general conversation, explanations, Q&A, anything not covered below
search: current events, latest news, real-time or recently changed information
coding: writing/debugging code, building apps, games, web pages, programming, databases, APIs
image: ONLY when the user clearly asks to generate a picture, poster, greeting card, logo or artwork
pdf: creating or processing PDF documents
ppt: creating PowerPoint presentations or slides

You will also get the recent conversation. If the last message is a short follow-up (like "add this", "change the color", "make it bigger"), choose the agent that fits the earlier topic. If the earlier topic was code, choose coding.

Reply with exactly one of: chat, search, coding, image, pdf, ppt`;

// Did the last AI message contain code?
const wasCode = (text = "") =>
    text.includes("[Code artifact") ||
    text.includes("```") ||
    /<!DOCTYPE html|<html/i.test(text);

export const router = async (state) => {
    const prompt = state.prompt || "";

    // 1. Clear image request
    if (IMAGE_VERB_NOUN.test(prompt) || IMAGE_OF.test(prompt)) {
        console.log("ROUTER → image (keyword match)");
        return { ...state, agent: "image" };
    }

    // 2. Memory (buildContext never throws)
    const { summaryText, pastMessages } = await buildContext(state.conversationId);

    const lastAssistant = [...pastMessages].reverse().find((m) => m.role === "assistant");
    const lastWasCode = wasCode(lastAssistant?.content);

    // 3. Follow-up on code: stay with the coding agent
    if (lastWasCode && !OTHER_AGENT.test(prompt)) {
        console.log("ROUTER → coding (follow-up, from memory)");
        return { ...state, agent: "coding" };
    }

    // 4. New code request
    if (CODE_ACTION.test(prompt) && CODE_THING.test(prompt)) {
        console.log("ROUTER → coding (keyword match)");
        return { ...state, agent: "coding" };
    }

    // 5. LLM routing with the last 4 messages as context
    try {
        const llm = await getModel("router");

        const recent = pastMessages
            .slice(-4)
            .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${String(m.content).slice(0, 300)}`)
            .join("\n");

        const input =
            (summaryText ? `Summary: ${summaryText.slice(0, 500)}\n\n` : "") +
            (recent ? `Recent conversation:\n${recent}\n\n` : "") +
            `User's last message: ${prompt.slice(0, 1500)}`;

        const response = await llm.invoke([
            { role: "system", content: ROUTER_PROMPT },
            { role: "human", content: input },
        ]);

        const raw = getText(response.content).toLowerCase();
        const found = raw.match(/\b(chat|search|coding|image|pdf|ppt)\b/);
        let agent = found && VALID_AGENTS.includes(found[1]) ? found[1] : "chat";

        // Safety: no image word in the message, so it cannot be an image request
        if (agent === "image" && !IMAGE_WORD.test(prompt)) {
            agent = lastWasCode ? "coding" : "chat";
        }

        console.log(`ROUTER → ${agent} (raw: ${JSON.stringify(raw.slice(0, 40))})`);
        return { ...state, agent };
    } catch (err) {
        console.error("Router failed, defaulting to chat:", err.message);
        return { ...state, agent: lastWasCode ? "coding" : "chat" };
    }
};