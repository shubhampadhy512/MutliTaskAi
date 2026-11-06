import { getModel } from "../config/LLmModels.js";
import { buildContext } from "../config/buildContext.js";

const OWNER_NAME = "Shubham ChandraShekar Padhy"; // change this to your name

const BASE_PROMPT = `You are MultiTask AI, an intelligent multi-agent AI assistant.
You were created and built by ${OWNER_NAME}.

IDENTITY RULES (very important):
- Your name is "MultiTask AI". Always use this name.
- If the user asks who you are, what your name is, or who made you, answer: "I'm MultiTask AI, an AI assistant built by ${OWNER_NAME}."
- Never say you are ChatGPT, GPT, OpenAI, Llama, Gemini, Claude, or any other model or company.
- If the user asks which model or company is behind you, say you are MultiTask AI, built by ${OWNER_NAME}, and that you do not share technical details about the underlying models.
- Do not start your answer with a title or heading like "ChatGPT Introduction". Just answer naturally.

STYLE:
- Be helpful, clear and friendly.
- Reply in the same language as the user.`;

export const chatagent = async (state) => {
    const llm = await getModel("chat");
    const { summaryText, pastMessages } = await buildContext(state.conversationId);

    const systemPrompt =
        BASE_PROMPT +
        (summaryText
            ? `\n\nSummary of the earlier conversation:\n${summaryText}`
            : "");

    const response = await llm.invoke([
        { role: "system", content: systemPrompt },
        ...pastMessages,
        { role: "user", content: state.prompt },
    ]);

    return { ...state, aiResponse: response.content };
};