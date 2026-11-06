import axios from "axios";
import { graph } from "../graph/graph.js";
import { formatResponse } from "../config/responseFormatter.js";
import { addToMemory } from "../config/memorize.js"; // keep YOUR path

export const Agent = async (req, res) => {
    try {
        const { prompt, conversationId } = req.body;

        await axios.post(`${process.env.CHAT_Service_URL}/save-message`, {
            conversationId,
            role: "user",
            content: prompt,
        });

        // The agents read memory here. Do NOT add the prompt to memory before this.
        const result = await graph.invoke({ prompt, conversationId });

        const skipFormatter =
            result.agent === "image" ||
            !!result.image ||
            !result.aiResponse ||
            result.aiResponse.length < 40;

        let response = result.aiResponse;
        if (!skipFormatter) {
            try {
                response = await formatResponse(result.aiResponse);
            } catch (formatErr) {
                console.error("Formatter failed, using raw response:", formatErr.message);
                response = result.aiResponse;
            }
        }

        await axios.post(`${process.env.CHAT_Service_URL}/save-message`, {
            conversationId,
            role: "ai",
            content: response,
            artifact: result.artifact ?? null,
            image: result.image ?? null,
        });

        // Save to memory AFTER the answer. A failure here must not break the answer.
        try {
            let memoryText = response;

            // Keep the code, so the coding agent can fix it later
            if (result.artifact?.code) {
                memoryText +=
                    `\n\n[Code artifact "${result.artifact.title}" (${result.artifact.language})]\n` +
                    result.artifact.code.slice(0, 6000);
            }

            // Do not keep the image in memory
            if (result.image) memoryText = "(An image was generated for the user.)";

            await addToMemory(conversationId, "user", prompt);
            await addToMemory(conversationId, "ai", memoryText);
        } catch (memErr) {
            console.error("Memory save failed:", memErr.message);
        }

        return res.status(200).json({
            aiResponse: response,
            artifact: result.artifact ?? null,
            image: result.image ?? null,
        });
    } catch (err) {
        console.error("Agent error:", err.message, err.response?.status);
        return res.status(500).json({ message: `Agent Error: ${err.message}` });
    }
};