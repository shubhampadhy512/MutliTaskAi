
import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts";

const memoryModel = new ChatGroq({
    model: "openai/gpt-oss-120b",
    temperature: 0.2,
    apiKey: process.env.GROQ_API_KEY
});

const memoryPrompt = ChatPromptTemplate.fromMessages([
    [
        "system",
        `You are a professional AI conversation memory summarizer.

        You will receive an array of conversation messages.
        Each object contains:
        - role: "user", "ai", or "summarized"
        - message: the message content

        Your task:
        - Summarize the entire conversation into one concise memory.
        - If a previous summarized message exists, merge it with the new messages.
        - Preserve important user information, project details,
          preferences, technical decisions, and ongoing tasks.
        - Remove unnecessary details and repeated information.
        - Do not lose important context from previous summaries.
        - Do not invent information.
        - Do not answer the user's questions.
        - Return ONLY the summarized message as plain text.
        - Do not include headings, Markdown, or explanations.`
    ],
    ["human", "{messages}"]
]);

export const summarizeMemory = async (messages) => {
    const chain = memoryPrompt.pipe(memoryModel);

    const result = await chain.invoke({
        messages: JSON.stringify(messages)
    });

    return result.content;
};
