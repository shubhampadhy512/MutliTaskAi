import { getModel } from "../config/LLmModels.js"

export const chatagent = async (state) => {
    const llm = await getModel("chat")
    const SystemPrompt = 'You are MultiTaskAi, An Intelligent Ai assistant.'

    const response = await llm.invoke([
        {
            "role":"system",
            "content":SystemPrompt
        },
        {
            "role":"human",
            "content":state.prompt
        }
    ])

    return {
        ...state,
        aiResponse:response.content
    }
}