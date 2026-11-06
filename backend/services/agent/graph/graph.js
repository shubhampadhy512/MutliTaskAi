import { StateGraph, START, END } from "@langchain/langgraph";

import { agentState } from "./state.agent.js";
import { router } from "./router.js";

import { chatagent } from "../agents/chat.agent.js";
import { codingagent } from "../agents/coding.agent.js";
import { imageagent } from "../agents/image.agent.js";
import { pdfagent } from "../agents/pdf.agent.js";
import { pptagent } from "../agents/ppt.agent.js";
import { searchagent } from "../agents/search.agent.js";

const workflow = new StateGraph(agentState);

workflow.addNode("router", router);
workflow.addNode("chat", chatagent);
workflow.addNode("search", searchagent);
workflow.addNode("coding", codingagent);
workflow.addNode("imageGen", imageagent); // renamed: "image" clashes with the state field
workflow.addNode("pdf", pdfagent);
workflow.addNode("ppt", pptagent);

workflow.addEdge(START, "router");

workflow.addConditionalEdges(
    "router",
    (state) => {
        switch (state.agent) {
            case "chat":
                return "chat";
            case "search":
                return "search";
            case "coding":
                return "coding";
            case "image":
                return "imageGen"; // state.agent stays "image", only the node is renamed
            case "pdf":
                return "pdf";
            case "ppt":
                return "ppt";
            default:
                return "chat";
        }
    },
    {
        chat: "chat",
        search: "search",
        coding: "coding",
        imageGen: "imageGen",
        pdf: "pdf",
        ppt: "ppt",
    }
);

// Search agent result goes to chat for final response
workflow.addEdge("search", "chat");

workflow.addEdge("chat", END);
workflow.addEdge("coding", END);
workflow.addEdge("imageGen", END);
workflow.addEdge("pdf", END);
workflow.addEdge("ppt", END);

export const graph = workflow.compile();