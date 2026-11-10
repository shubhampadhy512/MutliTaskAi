import { ChatGroq } from "@langchain/groq";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { TavilySearch } from "@langchain/tavily";
import { ChatOpenAI } from "@langchain/openai";

// Main chat model (big)
const groq = new ChatGroq({
    model: "openai/gpt-oss-120b",
    apiKey: process.env.GROQ_API_KEY,
});

// NEW: small model for the router (saves your daily Groq tokens)
const groqSmall = new ChatGroq({
    model: "openai/gpt-oss-20b",
    apiKey: process.env.GROQ_API_KEY,
    temperature: 0,
});

const geminiCodingMain = new ChatGoogleGenerativeAI({
    model: "gemini-3.1-flash-lite", // check the exact name in AI Studio
    apiKey: process.env.GOOGLE_API_KEY,
    temperature: 0.2,
    maxRetries: 2,
});

const openrouter = new ChatOpenAI({
    model: "mistralai/devstral-2:free",
    apiKey: process.env.OPENROUTER_API_KEY,
    configuration: { baseURL: "https://openrouter.ai/api/v1" },
    temperature: 0.2,
});

// Coding: Gemini, then OpenRouter, then Groq
const geminiCoding = geminiCodingMain.withFallbacks({
    fallbacks: [openrouter, groq],
});

const gemini_pdf_main = new ChatGoogleGenerativeAI({
    model: "gemini-flash-latest",
    apiKey: process.env.GOOGLE_API_KEY,
    maxRetries: 1, // fail faster, then use the backup
});

// NEW: PDF and PPT: Gemini, then Groq, then OpenRouter
const gemini_pdf = gemini_pdf_main.withFallbacks({
    fallbacks: [groq, openrouter],
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
        case "router":
            return groqSmall; // CHANGED: before, the router used the big model
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
};