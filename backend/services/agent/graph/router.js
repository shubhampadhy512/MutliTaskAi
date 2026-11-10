import { getModel } from "../config/LLmModels.js";
import { buildContext } from "../config/buildContext.js";
import { getLastDoc } from "../utils/docStore.js";
import { useCredit } from "../utils/credits.js";

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

// PDF / PPT
const PDF_WORD = /\bpdf\b/i;
const PPT_WORD =
    /\b(ppt|pptx|powerpoint|power point|presentation|slides?|slide deck)\b/i;
const MAKE_VERB =
    /\b(create|make|generate|write|prepare|build|give|convert|export|edit|change|update|replace|modify|add|remove)\b/i;
const EDIT_WORDS =
    /\b(change|replace|edit|update|add|remove|delete|rename|modify|fix|shorter|longer|translate|rewrite)\b/i;

// "Explain / read this PDF" is a chat job, not a PDF-making job
const READ_VERB =
    /\b(explain|read|summari[sz]e|translate|analy[sz]e|review|extract|word to word|word-to-word|what('s| is| does))\b/i;
const FILE_REF =
    /\b(this|attached|uploaded|that|the|my)\s+(pdf|ppt|pptx|file|document|resume|cv|presentation|slides?)\b/i;
const STRONG_MAKE = /\b(create|make|generate)\b/i;

// Search
const SEARCH_WORDS =
    /\b(latest|news|today'?s|weather|right now|live score|who won|stock price|search the web|search for|google)\b/i;

function getText(content) {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
        return content.map((p) => (typeof p === "string" ? p : p.text || "")).join("");
    }
    return String(content ?? "");
}

// Position of the last match of a word (or -1)
function lastMention(text, regex) {
    const g = new RegExp(regex.source, "gi");
    let pos = -1;
    let m;
    while ((m = g.exec(text))) pos = m.index;
    return pos;
}

// Which document does the user want: "pdf", "ppt" or null?
function documentTarget(prompt) {
    const hasPdf = PDF_WORD.test(prompt);
    const hasPpt = PPT_WORD.test(prompt);

    if (hasPdf && hasPpt) {
        if (/\bnot\s+(a\s+|the\s+)?pdf\b/i.test(prompt)) return "ppt"; // "ppt not pdf"
        if (/\bnot\s+(a\s+|the\s+)?(ppt|pptx|powerpoint|presentation|slides?)\b/i.test(prompt)) return "pdf";
        // "convert this pdf to ppt": the last word is the wanted result
        return lastMention(prompt, PDF_WORD) > lastMention(prompt, PPT_WORD) ? "pdf" : "ppt";
    }
    if (hasPpt) return "ppt";
    if (hasPdf) return "pdf";
    return null;
}

const ROUTER_PROMPT = `Classify the user's LAST message into exactly one agent. Reply with ONE word only.

chat: general conversation, explanations, Q&A, reading or explaining an existing or attached file, anything not covered below
search: current events, latest news, real-time or recently changed information
coding: writing/debugging code, building apps, games, web pages, programming, databases, APIs
image: ONLY when the user clearly asks to generate a picture, poster, greeting card, logo or artwork
pdf: ONLY when the user wants a NEW PDF file created, or an earlier PDF changed and given back
ppt: ONLY when the user wants a NEW PowerPoint file created, or an earlier PPT changed and given back

Important:
- If the user only asks to explain, read, summarize or translate a PDF or PPT, choose chat.
- If the last message is a short follow-up (like "add this", "change the color", "make it bigger"), choose the agent that fits the earlier topic. If the earlier topic was code, choose coding.
- If the user says "forget previous", ignore the earlier topic.

Reply with exactly one of: chat, search, coding, image, pdf, ppt`;

// Did the last AI message contain code?
const wasCode = (text = "") =>
    text.includes("[Code artifact") ||
    text.includes("```") ||
    /<!DOCTYPE html|<html/i.test(text);

// CHANGED: the old "router" is now "routeInner" (same logic, only the name is new)
const routeInner = async (state) => {
    // The prompt can contain long file text. Route only by what the user typed.
    const FILE_MARK = "[ATTACHED FILE CONTENT";
    const hasFileText = (state.prompt || "").includes(FILE_MARK);
    const prompt = hasFileText ? state.prompt.split(FILE_MARK)[0] : state.prompt || "";

    // 1. Clear image request
    if (IMAGE_VERB_NOUN.test(prompt) || IMAGE_OF.test(prompt)) {
        console.log("ROUTER → image (keyword match)");
        return { ...state, agent: "image" };
    }

    // 2. User attached a file.
    //    "edit / change ... and give me pdf/ppt" → pdf/ppt agent. Everything else → chat.
    if (hasFileText) {
        // Find the file type from the file name (resume.pdf → pdf)
        const fileNames = (state.prompt.match(/--- File: (.+?) ---/g) || []).join(" ").toLowerCase();
        const typeFromFile = /\.pdf\b/.test(fileNames)
            ? "pdf"
            : /\.pptx?\b/.test(fileNames)
                ? "ppt"
                : null;
        const fileTarget =
            documentTarget(prompt) || (EDIT_WORDS.test(prompt) ? typeFromFile : null);
        if (fileTarget && (MAKE_VERB.test(prompt) || EDIT_WORDS.test(prompt))) {
            console.log(`ROUTER → ${fileTarget} (attached file + edit/make)`);
            return { ...state, agent: fileTarget };
        }
        console.log("ROUTER → chat (user attached a file)");
        return { ...state, agent: "chat" };
    }

    // 3. Memory (buildContext never throws)
    const { summaryText, pastMessages } = await buildContext(state.conversationId);

    const lastAssistant = [...pastMessages].reverse().find((m) => m.role === "assistant");
    const lastText = String(lastAssistant?.content || "");
    const lastWasCode = wasCode(lastText);

    // 4. New PDF / PPT request (also "edit and give me pdf")
    const target = documentTarget(prompt);
    if (target && MAKE_VERB.test(prompt)) {
        console.log(`ROUTER → ${target} (keyword match)`);
        return { ...state, agent: target };
    }

    // 5. Follow-up on a PDF / PPT made earlier ("change the name ...")
    //    The PPT check is first, so "change slide 2" after a PPT edits the PPT.
    if (!target && EDIT_WORDS.test(prompt)) {
        if (lastText.includes("Your PPT is ready")) {
            console.log("ROUTER → ppt (follow-up, from memory)");
            return { ...state, agent: "ppt" };
        }
        const savedPdf = await getLastDoc(state.conversationId, "pdf");
        if (savedPdf || lastText.includes("Your PDF is ready")) {
            console.log("ROUTER → pdf (follow-up, from memory)");
            return { ...state, agent: "pdf" };
        }
    }

    // 6. Follow-up on code: stay with the coding agent
    if (lastWasCode && !OTHER_AGENT.test(prompt)) {
        console.log("ROUTER → coding (follow-up, from memory)");
        return { ...state, agent: "coding" };
    }

    // 7. New code request
    if (CODE_ACTION.test(prompt) && CODE_THING.test(prompt)) {
        console.log("ROUTER → coding (keyword match)");
        return { ...state, agent: "coding" };
    }

    // 8. Search request
    if (SEARCH_WORDS.test(prompt)) {
        console.log("ROUTER → search (keyword match)");
        return { ...state, agent: "search" };
    }

    // 9. LLM routing with the last 4 messages as context
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

// NEW: after the router chooses, image/pdf/ppt must use one credit.
// If credits are finished, the request goes to the "limit" node and stops.
export const router = async (state) => {
    const next = await routeInner(state);

    if (["image", "pdf", "ppt"].includes(next.agent) && state.userId) {
        const c = await useCredit(state.userId, next.agent);
        if (!c.ok) {
            const name = { image: "image", pdf: "PDF", ppt: "PPT" }[next.agent];
            console.log(`ROUTER → limit (${next.agent} credits finished)`);
            return {
                ...next,
                agent: "limit",
                aiResponse:
                    `Your daily ${name} limit is finished (${c.limit} per day for each user). ` +
                    `Please try again tomorrow. Normal chat is still unlimited.`,
            };
        }
    }
    return next;
};