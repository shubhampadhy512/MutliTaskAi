import {Anntotion} from "@langchain/langgraph"


export const agentState = Anntotion.Root({
    prompt:Anntotion(),
    aiResponse:Anntotion()
})