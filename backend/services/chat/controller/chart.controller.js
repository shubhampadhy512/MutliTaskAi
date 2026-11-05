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
export const updateConversation = async (req, res) => {
    try {
        const {id,title} = req.body

        const conversation = await Conversation.findByIdAndUpdate(id,{
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

        const { conversationId, role, content, artifact } = req.body
        const message = await Message.create({
            conversationId,
            role,
            content,
            artifact: artifact || undefined
        })

        return res.status(200).json(message)
    } catch (err) {
        return res.status(500).json({ message: `Create message error${err}` })
    }
}

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