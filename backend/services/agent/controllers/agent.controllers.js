import axios from "axios"
import { graph } from "../graph/graph.js"

export const Agent = async (req, res) => {
    try {

        const { prompt, conversationId } = req.body
        await axios.post(`${process.env.CHAT_Service_URL}/save-message`, {
            conversationId, role: 'user', content: prompt
        })

        const result = await graph.invoke({
            prompt, conversationId
        })

        const response = result.aiResponse

        return res.status(200).json(response)

    } catch (err) {
        return res.status(500).json({
            message: `Agent Error: ${err}`
        })
    }
}