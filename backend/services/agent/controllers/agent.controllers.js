import axios from "axios";
import redis from "../../../shared/redis/redis.js";
import { graph } from "../graph/graph.js";
import { formatResponse } from "../config/responseFormatter.js";
import { addToMemory } from "../config/memorize.js"; // keep YOUR path

export const Agent = async (req, res) => {
    try {
        const { prompt, conversationId, messageId } = req.body;
        const chatUrl = process.env.CHAT_Service_URL;

        // messageId exists = the user edited an old message
        const isEdit = !!messageId;

        let userMessageId = messageId || null;

        if (isEdit) {
            // Clear old memory. getMemory rebuilds it from MongoDB.
            try {
                await redis.del(`message:${conversationId}`);
            } catch (e) {
                console.error("Redis clear failed:", e.message);
            }
        } else {
            // New message: save the user message
            const savedUser = await axios.post(`${chatUrl}/save-message`, {
                conversationId,
                role: "user",
                content: prompt,
            });
            userMessageId = savedUser.data?._id ?? null;
        }

        const result = await graph.invoke({ prompt, conversationId });

        const skipFormatter =
            result.agent === "image" ||
            result.agent === "pdf" ||
            result.agent === "search" ||
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

        // ALWAYS save the AI message (new chat and edit)
        const savedAi = await axios.post(`${chatUrl}/save-message`, {
            conversationId,
            role: "ai",
            content: response,
            artifact: result.artifact ?? null,
            image: result.image ?? null,
        });

        // Save to memory AFTER the answer
        try {
            let memoryText = response;

            if (result.artifact?.code) {
                memoryText +=
                    `\n\n[Code artifact "${result.artifact.title}" (${result.artifact.language})]\n` +
                    result.artifact.code.slice(0, 6000);
            }
            if (result.image) memoryText = "(An image was generated for the user.)";

            await addToMemory(conversationId, "user", prompt);
            await addToMemory(conversationId, "ai", memoryText);
        } catch (memErr) {
            console.error("Memory save failed:", memErr.message);
        }

        return res.status(200).json({
            userMessageId,
            aiMessageId: savedAi.data?._id ?? null,
            aiResponse: response,
            artifact: result.artifact ?? null,
            image: result.image ?? null,
        });
    } catch (err) {
        console.error("Agent error:", err.message, err.response?.status);
        return res.status(500).json({ message: `Agent Error: ${err.message}` });
    }
};