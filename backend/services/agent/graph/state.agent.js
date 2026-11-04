import { Annaotation } from "@langchain/langgraph"


export const agentState = Annaotation.Root({
    prompt: Annotation(),
    aiResponse: Annotation()
})