import { getModel } from "../config/LLmModels.js";
import { buildContext } from "../config/buildContext.js";

function getText(content) {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
        return content.map((p) => (typeof p === "string" ? p : p.text || "")).join("");
    }
    return String(content ?? "");
}

const OWNER_NAME = "Tarni Shankar Padhy"; // change if you want

// Step 1: make a short search query.
// "what about his age?" becomes "Virat Kohli age"
async function makeSearchQuery(state, pastMessages) {
    // No earlier messages: use the prompt as it is
    if (pastMessages.length === 0) return state.prompt.slice(0, 300);

    try {
        const llm = await getModel("router"); // small model saves tokens

        const recent = pastMessages
            .slice(-4)
            .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${String(m.content).slice(0, 200)}`)
            .join("\n");

        const res = await llm.invoke([
            {
                role: "system",
                content:
                    "Write ONE short web search query (max 12 words) for the user's last message. " +
                    "Use the conversation to understand words like 'he', 'it', 'that'. " +
                    "Return ONLY the query text.",
            },
            {
                role: "human",
                content: `Conversation:\n${recent}\n\nLast message: ${state.prompt.slice(0, 500)}`,
            },
        ]);

        const q = getText(res.content).replace(/["\n]/g, " ").trim();
        return q || state.prompt.slice(0, 300);
    } catch (err) {
        console.error("Query rewrite failed:", err.message);
        return state.prompt.slice(0, 300);
    }
}

// Step 2: search with Tavily
async function runSearch(query) {
    const tavily = await getModel("search");
    const raw = await tavily.invoke({ query });

    // The result can be an object or a JSON text
    let data = raw;
    if (typeof raw === "string") {
        try {
            data = JSON.parse(raw);
        } catch {
            return [];
        }
    }

    return (data?.results || []).slice(0, 5).map((r) => ({
        title: r.title || r.url,
        url: r.url,
        content: String(r.content || "").slice(0, 800), // protects your token limit
    }));
}

export const searchagent = async (state) => {
    console.log("SEARCH AGENT CALLED with:", state.prompt.slice(0, 50));

    const { summaryText, pastMessages } = await buildContext(state.conversationId);
    const llm = await getModel("chat");

    const today = new Date().toDateString();
    const baseSystem =
        `You are MultiTask AI, an intelligent assistant built by ${OWNER_NAME}. ` +
        `Never say you are ChatGPT or any other model. Today's date is ${today}.` +
        (summaryText ? `\n\nSummary of the earlier conversation:\n${summaryText}` : "");

    // Step 1 + 2
    let results = [];
    let query = "";
    try {
        query = await makeSearchQuery(state, pastMessages);
        console.log("Search query:", query);
        results = await runSearch(query);
        console.log(`Found ${results.length} results`);
    } catch (err) {
        console.error("Search failed:", err.message);
    }

    // Search failed or empty: answer without search and say so
    if (results.length === 0) {
        const response = await llm.invoke([
            {
                role: "system",
                content:
                    baseSystem +
                    "\n\nWeb search did not work right now. Answer from your own knowledge. " +
                    "Start with one short sentence saying live search was unavailable, " +
                    "and that the information may be out of date.",
            },
            ...pastMessages,
            { role: "user", content: state.prompt },
        ]);
        return { ...state, aiResponse: getText(response.content) };
    }

    // Step 3: answer from the results
    const sourcesText = results
        .map((r, i) => `[${i + 1}] ${r.title}\n${r.content}`)
        .join("\n\n");

    const response = await llm.invoke([
        {
            role: "system",
            content:
                baseSystem +
                `\n\nYou have web search results below. Use them to answer the user.
Rules:
- Use only facts from the results. If they do not answer the question, say so.
- Do not invent facts, numbers or links.
- Mention the source number like [1] after a fact.
- Be clear and short. Do not write a "Sources" list. The system adds it.

SEARCH RESULTS:
${sourcesText}`,
        },
        ...pastMessages,
        { role: "user", content: state.prompt },
    ]);

    // Real links are added by code, so the AI cannot make fake links
    const sourceList = results.map((r, i) => `${i + 1}. [${r.title}](${r.url})`).join("\n");

    return {
        ...state,
        aiResponse: `${getText(response.content)}\n\n**Sources**\n${sourceList}`,
    };
};