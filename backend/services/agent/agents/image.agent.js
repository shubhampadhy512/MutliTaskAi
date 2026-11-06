import { imageProviders } from "../config/imageProviders.js";
import { uploadImage } from "../config/cloudinary.js";
import { getModel } from "../config/LLmModels.js";
import { buildContext } from "../config/buildContext.js";
import { addLogo } from "../config/addLogo.js";

function getText(content) {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
        return content.map((p) => (typeof p === "string" ? p : p.text || "")).join("");
    }
    return String(content ?? "");
}

// If this is a short follow-up, join it with the previous image prompt
async function buildImagePrompt(state) {
    const prompt = state.prompt || "";

    // Long prompts are already complete
    if (prompt.length > 200) return prompt;

    try {
        const { pastMessages } = await buildContext(state.conversationId);

        // Find the last image answer, then the user message before it
        let lastImagePrompt = null;
        for (let i = pastMessages.length - 1; i > 0; i--) {
            const m = pastMessages[i];
            if (m.role === "assistant" && m.content.includes("An image was generated")) {
                const before = pastMessages[i - 1];
                if (before?.role === "user") lastImagePrompt = before.content;
                break;
            }
        }

        // No earlier image: use the prompt as it is
        if (!lastImagePrompt) return prompt;

        const llm = await getModel("router"); // small model saves tokens
        const response = await llm.invoke([
            {
                role: "system",
                content:
                    "You write prompts for an image generator. You get the previous image prompt and a new request from the user. " +
                    "If the new request changes or adds to the previous image, return ONE new full image prompt that includes the change. " +
                    "If the new request is a completely different image, return the new request as it is. " +
                    "Return ONLY the prompt text, in English, no explanation.",
            },
            {
                role: "human",
                content: `Previous image prompt: ${lastImagePrompt.slice(0, 800)}\n\nNew request: ${prompt}`,
            },
        ]);

        const finalPrompt = getText(response.content).trim();
        return finalPrompt || prompt;
    } catch (err) {
        console.error("Image prompt build failed:", err.message);
        return prompt;
    }
}

export const imageagent = async (state) => {
    console.log("IMAGE AGENT CALLED with:", state.prompt.slice(0, 50));

    const finalPrompt = await buildImagePrompt(state);
    if (finalPrompt !== state.prompt) {
        console.log("Image prompt rewritten:", finalPrompt.slice(0, 80));
    }

    let image = null;
    let lastError = null;

    for (const provider of imageProviders) {
        try {
            image = await provider.run(finalPrompt);
            console.log(`Image generated with ${provider.name}`);
            break;
        } catch (err) {
            lastError = err;
            console.error(`Image provider ${provider.name} failed:`, err.message);
        }
    }

    if (!image) {
        return {
            ...state,
            aiResponse: "Image generation is unavailable right now. Please try again later.",
            image: null,
            error: String(lastError?.message || lastError),
        };
    }

    try {
        image = await addLogo(image);
        console.log("Logo added");
    } catch (err) {
        console.error("Add logo failed:", err.message);
    }

    // 2. Upload to Cloudinary: save a short URL instead of big base64
    try {
        image = await uploadImage(image);
        console.log("Uploaded to Cloudinary");
    } catch (err) {
        console.error("Cloudinary failed:", err.message);
        // keep base64 so the user still sees the image
    }

    return { ...state, aiResponse: "Here's your image.", image };
};