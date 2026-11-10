import Conversation from "../model/conversation.model.js"
import Message from "../model/message.model.js"

export const createConversation = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        console.log("UserId", userId)
        const conversation = await Conversation.create({
            userId
        })
        return res.status(200).json(conversation)
    } catch (err) {
        return res.status(500).json({
            message: `Create conversation error ${err}`
        })
    }
}

export const getConversation = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        console.log("UserId", userId)
        const conversation = await Conversation.find({
            userId: userId
        }).sort({ updatedAt: -1 })
        return res.status(200).json(conversation)
    } catch (err) {
        return res.status(500).json({
            message: `Create conversation error ${err}`
        })
    }
}

export const deleteConversation = async (req, res) => {
    try {
        const conversationId = req.params.id
        const userId = req.headers["x-user-id"]

        const conversation = await Conversation.findOneAndDelete({
            _id: conversationId,
            userId,
        })

        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" })
        }

        await Message.deleteMany({ conversationId: conversation._id })

        return res.status(200).json({
            message: "Conversation is successfully deleted"
        })

    } catch (error) {
        console.error("Delete conversation error:", error.message)
        return res.status(500).json({
            message: "Something went wrong while deleting conversation"
        })
    }
}

export const updateConversation = async (req, res) => {
    try {
        const { id, title } = req.body

        const conversation = await Conversation.findByIdAndUpdate(id, {
            title
        })
        return res.status(200).json(conversation)
    } catch (err) {
        return res.status(500).json({
            message: `Update conversation error ${err}`
        })
    }
}

export const saveMessage = async (req, res) => {
    try {

        const { conversationId, role, content, artifact, image, attachments } = req.body
        const message = await Message.create({
            conversationId,
            role,
            content,
            artifact: artifact || null,
            image: image || null,
            attachments: Array.isArray(attachments) ? attachments : [], // NEW
        })

        return res.status(200).json(message)
    } catch (err) {
        return res.status(500).json({ message: `Create message error${err}` })
    }
}

export const updateMessage = async (req, res) => {
    try {
        const { conversationId, messageId, prompt } = req.body;

        if (!conversationId || !messageId || typeof prompt !== "string" || !prompt.trim()) {
            return res.status(400).json({ message: "Missing data" });
        }

        const userId = req.headers["x-user-id"]
        const conversation = await Conversation.findOne({
            _id: conversationId,
            userId,
        })

        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" });
        }

        const message = await Message.findOne({
            _id: messageId,
            conversationId,
            role: "user",
        });

        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }

        message.content = prompt.trim();
        await message.save();

        const response = await fetch(`${process.env.AGENT_Service_URL}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversationId, prompt: prompt.trim(), messageId }),
        });
        const responseData = await response.json();

        if (!response.ok) {
            return res.status(response.status).json(responseData);
        }

        return res.status(200).json(responseData);
    } catch (error) {
        console.error("Update message error:", error.message, error.response?.status);
        return res.status(500).json({
            message: "Something went wrong while updating message",
        });
    }
};

export const getMessage = async (req, res) => {
    try {

        const { conversationId } = req.body
        const message = await Message.find({
            conversationId
        }).sort({ createdAt: -1 })

        return res.status(200).json(message)
    } catch (err) {
        return res.status(500).json({ message: `Getting message error${err}` })
    }
}
