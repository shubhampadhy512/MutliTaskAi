import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { parseOfficeAsync } from "officeparser";

const PPT_TYPES = [
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

const getText = (content) => {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
        return content.map((p) => (typeof p === "string" ? p : p.text || "")).join("");
    }
    return String(content ?? "");
};

async function readOne(file) {
    if (PPT_TYPES.includes(file.mimetype)) {
        const text = await parseOfficeAsync(file.buffer);
        return String(text);
    }

    const gemini = new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash",
        apiKey: process.env.GEMINI_API_KEY, // use the same name as in your .env
        temperature: 0.2,
    });

    const filePart =
        file.mimetype === "application/pdf"
            ? { type: "media", mimeType: "application/pdf", data: file.buffer.toString("base64") }
            : {
                type: "image_url",
                image_url: `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
            };

    const instruction =
        file.mimetype === "application/pdf"
            ? "Write out all the text of this PDF exactly as it is. Do not add anything."
            : "Write out all visible text in this image exactly. Then describe the image in 3-5 short lines.";

    const response = await gemini.invoke([
        { role: "user", content: [{ type: "text", text: instruction }, filePart] },
    ]);
    return getText(response.content);
}

// Returns one text block for all files. Never throws.
export async function readFiles(files) {
    const results = await Promise.all(
        files.map(async (f) => {
            try {
                const text = (await readOne(f)).slice(0, 30000);
                return `--- File: ${f.originalname} ---\n${text}`;
            } catch (err) {
                console.error("File read failed:", f.originalname, err.message);
                return `--- File: ${f.originalname} ---\n(This file could not be read.)`;
            }
        })
    );
    return results.join("\n\n");
}