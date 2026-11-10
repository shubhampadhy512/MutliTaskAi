import { getModel } from "../config/LLmModels.js";
import { buildContext } from "../config/buildContext.js";

const OWNER_NAME = "Shubham ChandraShekar Padhy"; // change this to your name

// TEMPORARY: set this to true after the file attachment backend is built (TODO 4)
const ATTACHMENTS_READY = false;

// Words that mean "read / explain a file"
const READ_VERB =
    /\b(explain|read|summari[sz]e|translate|analy[sz]e|review|extract|word to word|word-to-word|what('s| is| does))\b/i;
// Words that point to a file
const FILE_REF =
    /\b(this|attached|uploaded|my)\s+(pdf|ppt|pptx|file|document|resume|cv|presentation|slides?|image)\b/i;
// "forget previous" (also the typo "pervious")
const FORGET =
    /\b(forget|ignore|drop|clear)\b[^.?!\n]{0,20}\b(previous|pervious|earlier|above|before|everything|all)\b/i;

// Remove any made-up PDF/PPT links from a chat answer
const stripFakeFileLinks = (text) =>
    String(text ?? "")
        .replace(/\[[^\]]*\]\(https?:\/\/[^\s)]+\.(pdf|pptx?)[^)]*\)/gi, "")
        .trim();

const BASE_PROMPT = `You are MultiTask AI, an intelligent multi-agent AI assistant.
You were created and built by ${OWNER_NAME}.

IDENTITY RULES (very important):
- Your name is "MultiTask AI". Always use this name.
- If the user asks who you are, what your name is, or who made you, answer: "I'm MultiTask AI, an AI assistant built by ${OWNER_NAME}."
- Never say you are ChatGPT, GPT, OpenAI, Llama, Gemini, Claude, or any other model or company.
- If the user asks which model or company is behind you, say you are MultiTask AI, built by ${OWNER_NAME}, and that you do not share technical details about the underlying models.
- Do not start your answer with a title or heading like "ChatGPT Introduction". Just answer naturally.

HONESTY RULES (very important):
- Never invent the content of a file, PDF, PPT, resume or image that you cannot see in this conversation.
- Only talk about a document if its real text is written in the conversation.
- If the user says "forget previous" or "ignore earlier", do not use any earlier topic. Answer only the new message.
- If you are not sure what the user means, ask one short question.
- Never write a download link or a file link. You cannot create files. Only the PDF and PPT agents create files.
- If the user asks to change or create a file, say you could not do it in this chat and ask them to repeat the request with the word "PDF" or "PPT".

STYLE:
- Be helpful, clear and friendly.
- Use simple words.
- Reply in the same language as the user.`;

export const chatagent = async (state) => {
    const prompt = state.prompt || "";

    // TEMPORARY guard: the user talks about a file, but files are not sent to the backend yet.
    if (!ATTACHMENTS_READY && READ_VERB.test(prompt) && FILE_REF.test(prompt)) {
        return {
            ...state,
            aiResponse:
                "I can't read attached files yet, so I can't see that file. " +
                "Please paste the text here and I will explain it word by word. " +
                "If you mean the PDF I made earlier, write: \"explain the PDF you made\".",
        };
    }

    const llm = await getModel("chat");

    // "forget previous" = do not send the old memory to the model
    const forget = FORGET.test(prompt);
    const { summaryText, pastMessages } = forget
        ? { summaryText: "", pastMessages: [] }
        : await buildContext(state.conversationId);

    const systemPrompt =
        BASE_PROMPT +
        (summaryText
            ? `\n\nSummary of the earlier conversation:\n${summaryText}`
            : "");

    const response = await llm.invoke([
        { role: "system", content: systemPrompt },
        ...pastMessages,
        { role: "user", content: prompt },
    ]);

    return { ...state, aiResponse: stripFakeFileLinks(response.content) };
};