import { getModel } from "../config/LLmModels.js";

export const imageagent = async (state) => {
    const llm = await getModel("image");
    const SystemPrompt = "You are MultiTaskAI Image Agent. Generate a high-quality, detailed image for the user's request.";

    const response = await llm.invoke([
        {
            role: "system",
            content: SystemPrompt,
        },
        {
            role: "human",
            content: state.prompt,
        },
    ]);

    // Content can be a string or an array of parts (text + image)
    let text = "";
    let imageUrl = null;

    if (typeof response.content === "string") {
        text = response.content;
    } else if (Array.isArray(response.content)) {
        for (const part of response.content) {
            if (typeof part === "string") {
                text += part;
            } else if (part.type === "text") {
                text += part.text || "";
            } else if (part.type === "image_url") {
                // LangChain format: string or { url }
                imageUrl = typeof part.image_url === "string" ? part.image_url : part.image_url?.url;
            } else if (part.inlineData?.data) {
                // Raw Gemini format
                imageUrl = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
            }
        }
    }

    return {
        ...state,
        aiResponse: text || (imageUrl ? "Here's your image." : "I couldn't generate an image. Try rephrasing."),
        image: imageUrl, // data URL like "data:image/png;base64,..." or null
    };
};