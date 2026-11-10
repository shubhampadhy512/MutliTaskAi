import { Annotation } from "@langchain/langgraph";

export const agentState = Annotation.Root({
    prompt: Annotation(),
    aiResponse: Annotation(),
    agent: Annotation(),
    conversationId: Annotation(),
    artifact: Annotation(),
    image: Annotation(),   // the image data URL from imageagent
    error: Annotation(),   // used by imageagent when all providers fail
    hasFiles: Annotation(),
    files: Annotation(),
    userId: Annotation(),  // NEW: needed for the credit check in the router
});