import axios from "axios";
import redis from "../../../shared/redis/redis.js";
import { graph } from "../graph/graph.js";
import { formatResponse } from "../config/responseFormatter.js";
import { addToMemory } from "../config/memorize.js"; // keep YOUR path
import { uploadAttachment } from "../config/cloudinary.js";
import { readFiles } from "../utils/readFiles.js";
import { registerUser } from "../utils/credits.js"; // NEW

const MAX_MESSAGES_PER_CHAT = 40; // NEW: after this, the user must start a new chat

export const Agent = async (req, res) => {
    try {
        const { conversationId, messageId } = req.body;
        const chatUrl = process.env.CHAT_Service_URL;
        const userId = req.headers["x-user-id"] || null; // NEW

        const files = req.files || [];
        const hasFiles = files.length > 0;

        const prompt =
            req.body.prompt?.trim() ||
            (hasFiles ? "Please explain the attached file(s)." : "");

        const isEdit = !!messageId;

        // NEW: count this user as active today (for equal credits)
        if (userId) await registerUser(userId);

        // NEW: one chat can have only MAX_MESSAGES_PER_CHAT messages
        if (!isEdit) {
            try {
                const chatKey = `chat-count:${conversationId}`;
                const count = await redis.incr(chatKey);
                if (count === 1) await redis.expire(chatKey, 30 * 24 * 60 * 60);
                if (count > MAX_MESSAGES_PER_CHAT) {
                    await redis.decr(chatKey);
                    return res.status(403).json({
                        message: `This chat is full (${MAX_MESSAGES_PER_CHAT} messages). Please start a new chat.`,
                    });
                }
            } catch (e) {
                console.error("Chat count failed:", e.message); // do not block the user
            }
        }

        let userMessageId = messageId || null;

        if (isEdit) {
            try {
                await redis.del(`message:${conversationId}`);
            } catch (e) {
                console.error("Redis clear failed:", e.message);
            }
        } else if (!hasFiles) {
            const savedUser = await axios.post(`${chatUrl}/save-message`, {
                conversationId,
                role: "user",
                content: prompt,
            });
            userMessageId = savedUser.data?._id ?? null;
        }

        const attachments = [];
        const uploadPromise = hasFiles
            ? Promise.allSettled(
                files.map((f) => uploadAttachment(f.buffer, f.originalname, f.mimetype))
            )
            : Promise.resolve([]);

        let aiPrompt = prompt;
        let fileText = "";
        if (hasFiles) {
            fileText = await readFiles(files);
            aiPrompt =
                `${prompt}\n\n[ATTACHED FILE CONTENT - real text from the user's files]\n` +
                `${fileText}\n[END OF ATTACHED FILE CONTENT]`;
        }

        // NEW: userId goes to the graph for the credit check
        const [uploads, result] = await Promise.all([
            uploadPromise,
            graph.invoke({ prompt: aiPrompt, conversationId, userId }),
        ]);

        uploads.forEach((u) => {
            if (u.status === "fulfilled") attachments.push(u.value);
            else console.error("Upload failed:", u.reason?.message);
        });

        if (!isEdit && hasFiles) {
            const savedUser = await axios.post(`${chatUrl}/save-message`, {
                conversationId,
                role: "user",
                content: prompt,
                attachments,
            });
            userMessageId = savedUser.data?._id ?? null;
        }

        const skipFormatter =
            result.agent === "image" ||
            result.agent === "pdf" ||
            result.agent === "ppt" ||
            result.agent === "search" ||
            result.agent === "limit" || // NEW
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

        const savedAi = await axios.post(`${chatUrl}/save-message`, {
            conversationId,
            role: "ai",
            content: response,
            artifact: result.artifact ?? null,
            image: result.image ?? null,
        });

        try {
            let memoryText = response;

            if (result.artifact?.code) {
                memoryText +=
                    `\n\n[Code artifact "${result.artifact.title}" (${result.artifact.language})]\n` +
                    result.artifact.code.slice(0, 6000);
            }
            if (result.image) memoryText = "(An image was generated for the user.)";

            const userMemory = hasFiles
                ? `${prompt}\n[User attached: ${files.map((f) => f.originalname).join(", ")}]\n` +
                `${fileText.slice(0, 4000)}`
                : prompt;

            await addToMemory(conversationId, "user", userMemory);
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
            attachments,
        });
    } catch (err) {
        console.error("Agent error:", err.message, err.response?.status);
        return res.status(500).json({ message: `Agent Error: ${err.message}` });
    }
};