import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts";

const formatterModel = new ChatGroq({
    model: "openai/gpt-oss-120b",
    temperature: 0.2,
    apiKey: process.env.GROQ_API_KEY
});

const formatterPrompt = ChatPromptTemplate.fromMessages([
    [
        "system",
        `You are a professional AI response formatter.

        Format the given AI response into a clear, readable,
        well-structured answer.

        Rules:
        - Use Markdown headings when appropriate.
        - Use bullet points for lists.
        - If you use a Markdown table, put the header, separator, and every row on separate lines.
        - Prefer a numbered or bulleted list over a table when it is easier to read.
        - Never flatten table rows into one paragraph or include table separator pipes in prose.
        - Use code blocks for programming code.
        - Keep explanations beginner-friendly.
        - Remove unnecessary repetition.
        - Preserve the original meaning and technical accuracy.
        - Do not invent information.
        - Do not change code logic.
        - Return only the formatted response.`
    ],
    ["human", "{response}"],
]);

export const formatResponse = async (response) => {
    const chain = formatterPrompt.pipe(formatterModel);

    const result = await chain.invoke({
        response,
    });

    return result.content;
};