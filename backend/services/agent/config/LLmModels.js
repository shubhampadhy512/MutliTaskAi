import { ChatGroq } from "@langchain/groq"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { TavilySearch } from "@langchain/tavily"
import { ChatDeepSeek } from "@langchain/deepseek";
import { ChatOpenAI } from "@langchain/openai";

const groq = new ChatGroq({
    model: "openai/gpt-oss-120b",
    apiKey: process.env.GROQ_API_KEY
})

const gemini = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash-image",
    apiKey: process.env.GOOGLE_API_KEY
})

const geminiCoding = new ChatGoogleGenerativeAI({
    model: "gemini-3.1-flash-lite", // or "gemini-3-flash-preview"
    apiKey: process.env.GOOGLE_API_KEY,
    temperature: 0.2,
});

const gemini_pdf = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey: process.env.GOOGLE_API_KEY
})


const tavilysearch = new TavilySearch({
    maxResults: 5,
    apiKey: process.env.TAVILY_API_KEY
});

const deepseek = new ChatDeepSeek({
    model: "deepseek-reasoner",
    apiKey: process.env.DEEPSEEK_API_KEY
})


const openrouter = new ChatOpenAI({
    model: "mistralai/devstral-2:free",
    apiKey: process.env.OPENROUTER_API_KEY,
    base_url: "https://openrouter.ai/api/v1",
}
)

export const getModel = async (agent) => {
    switch (agent) {
        case "chat":
            return groq;
        case "search":
            return tavilysearch;
        case "coding":
            return geminiCoding;
        case "image":
            return gemini;
        case "pdf":
            return gemini_pdf;
        case "ppt":
            return gemini_pdf
        default:
            return groq
    }
}