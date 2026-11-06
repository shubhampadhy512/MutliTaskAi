import { ChatGroq } from "@langchain/groq";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { TavilySearch } from "@langchain/tavily";
import { ChatOpenAI } from "@langchain/openai";

const groq = new ChatGroq({
    model: "openai/gpt-oss-120b",
    apiKey: process.env.GROQ_API_KEY,
});

const geminiCodingMain = new ChatGoogleGenerativeAI({
    model: "gemini-3.1-flash-lite", // check the exact name in AI Studio
    apiKey: process.env.GOOGLE_API_KEY,
    temperature: 0.2,
    maxRetries: 2,
});

// FIX: ChatOpenAI needs configuration.baseURL, not base_url
const openrouter = new ChatOpenAI({
    model: "mistralai/devstral-2:free", // check OpenRouter's current :free list
    apiKey: process.env.OPENROUTER_API_KEY,
    configuration: { baseURL: "https://openrouter.ai/api/v1" },
    temperature: 0.2,
});

// Coding: Gemini first, OpenRouter if Gemini fails (503/429)
const geminiCoding = geminiCodingMain.withFallbacks({ fallbacks: [openrouter] });

const gemini_pdf = new ChatGoogleGenerativeAI({
    model: "gemini-flash-latest", // gemini-2.5-flash may be retired
    apiKey: process.env.GOOGLE_API_KEY,
    maxRetries: 2,
});

const tavilysearch = new TavilySearch({
    maxResults: 5,
    apiKey: process.env.TAVILY_API_KEY,
});

export const getModel = async (agent) => {

    console.log(`getModel("${agent}") `);
    switch (agent) {
        case "chat":
            return groq;
        case "search":
            return tavilysearch;
        case "coding":
            return geminiCoding;
        case "pdf":
        case "ppt":
            return gemini_pdf;
        default:
            return groq;
    }
}