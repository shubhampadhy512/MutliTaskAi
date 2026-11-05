import axios from "axios"
import { graph } from "../graph/graph.js"
import { formatResponse } from "../config/responseFormatter.js"

export const Agent = async (req, res) => {
    try {

        const { prompt, conversationId } = req.body
        await axios.post(`${process.env.CHAT_Service_URL}/save-message`, {
            conversationId, role: 'user', content: prompt
        })

        const result = await graph.invoke({
            prompt, conversationId
        })

        const response = await formatResponse(result.aiResponse)

        await axios.post(`${process.env.CHAT_Service_URL}/save-message`, {
            conversationId, role: 'ai', content: response, artifact: result.artifact || null
        })

        console.log(response)
        return res.status(200).json({
            aiResponse: response,
            artifact: result.artifact || null
        })

    } catch (err) {
        return res.status(500).json({
            message: `Agent Error: ${err}`
        })
    }
}