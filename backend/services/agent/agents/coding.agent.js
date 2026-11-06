import { getModel } from "../config/LLmModels.js";
import { buildContext } from "../config/buildContext.js";

const SYSTEM_PROMPT = `
You are MultiTaskAI Coding Agent, an expert software developer.

GENERAL RULES
- Write clean, correct, efficient, complete code. Never use placeholders like "..." or "rest of code here".
- Follow best practices for the language or framework requested.
- Fix bugs when asked, and return the full corrected code.
- Keep explanations short.
- If the user asks to change or fix earlier code, use the earlier code from the conversation and return the FULL updated code.

WHEN TO CREATE AN ARTIFACT
Create an artifact when the user asks to build something substantial: a web page, app, component, game, UI, script, or any code longer than about 20 lines.
For small snippets or quick questions, answer normally in a Markdown code block with no artifact.

ARTIFACT FORMAT (strict)
1. Write a 1-3 sentence explanation first, OUTSIDE the artifact.
2. Then output exactly one artifact block:

<artifact title="Short Title" language="html">
...complete source code only...
</artifact>

3. Do NOT wrap the artifact block in Markdown backticks.
4. Do NOT put explanations or comments like "here is the code" inside the artifact.
5. After the artifact, add at most 2 sentences (usage notes or how to run it).

LANGUAGE RULES
- For anything that should have a live preview (web pages, UI, React, games, calculators, landing pages): use language="html" and produce ONE self-contained HTML file with inline CSS and JavaScript.
- For React: still use language="html". Load React 18, ReactDOM and Babel standalone from https://cdnjs.cloudflare.com (UMD builds) inside the HTML, and write the component in <script type="text/babel">. Use ReactDOM.createRoot to render it.
- Do not use localStorage, sessionStorage, or external images; use inline SVG, emoji, or CSS for visuals.
- The artifact must render useful content immediately when opened. Never leave placeholder comments, TODOs, empty components, or instructions asking the user to finish or replace code.
- Prefer plain HTML, CSS, and JavaScript when React is not specifically needed. Do not rely on network APIs, external data, or assets other than the allowed React/Babel CDN scripts.
- For non-previewable code (Python, Node.js, C++, SQL, etc.): use the correct language value (python, javascript, cpp, sql...). These show only in the Code tab.
- The preview is rendered by the frontend sandbox, not by you.
`;

// Pull the artifact out of the model's reply
function parseArtifact(text) {
    const match = text.match(
        /<artifact\s+title="([^"]*)"\s+language="([^"]*)"\s*>([\s\S]*?)<\/artifact>/i
    );
    if (!match) return { message: text.trim(), artifact: null };

    const [fullMatch, title, language, code] = match;
    const cleanCode = code
        .trim()
        .replace(/^```[a-z]*\n?/i, "")
        .replace(/\n?```$/, "");

    return {
        message: text.replace(fullMatch, "").trim(),
        artifact: {
            title,
            language: language.toLowerCase(),
            code: cleanCode,
            previewable: ["html", "svg"].includes(language.toLowerCase()),
        },
    };
}

// Gemini sometimes returns content as an array of parts
function getText(content) {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
        return content.map((p) => (typeof p === "string" ? p : p.text || "")).join("");
    }
    return String(content ?? "");
}

export const codingagent = async (state) => {
    const llm = await getModel("coding");

    // Memory: summary + last messages
    const { summaryText, pastMessages } = await buildContext(state.conversationId);

    const systemPrompt =
        SYSTEM_PROMPT +
        (summaryText
            ? `\n\nSummary of the earlier conversation:\n${summaryText}`
            : "");

    const response = await llm.invoke([
        { role: "system", content: systemPrompt },
        ...pastMessages,
        { role: "user", content: state.prompt },
    ]);

    const { message, artifact } = parseArtifact(getText(response.content));
    return {
        ...state,
        aiResponse: message,
        artifact, // { title, language, code, previewable } or null
    };
};