import PDFDocument from "pdfkit";
import { getModel } from "../config/LLmModels.js";
import { buildContext } from "../config/buildContext.js";
import { uploadFile } from "../config/cloudinary.js";

function getText(content) {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
        return content.map((p) => (typeof p === "string" ? p : p.text || "")).join("");
    }
    return String(content ?? "");
}

const SYSTEM_PROMPT = `You are MultiTask AI PDF Writer. Write the content of a PDF document.

Return ONLY valid JSON. No Markdown, no backticks, no explanation. Use this exact shape:
{
  "title": "Document title",
  "sections": [
    {
      "heading": "Section heading",
      "paragraphs": ["paragraph text"],
      "bullets": ["point"]
    }
  ]
}

Rules:
- "paragraphs" and "bullets" can be empty arrays.
- Write real, complete content. No placeholders.
- Plain text only inside strings (no ** or # symbols).
- If the user asks to change an earlier PDF, use the earlier content from the conversation and return the FULL updated document.
- Write in the same language as the user.`;

// Get the JSON out of the model reply
function parseDoc(text) {
    const clean = text.replace(/```json|```/gi, "").trim();
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("No JSON in model reply");

    const doc = JSON.parse(clean.slice(start, end + 1));
    if (!doc.title || !Array.isArray(doc.sections)) throw new Error("Bad JSON shape");
    return doc;
}

// Make the PDF file in memory
function buildPdf(doc) {
    return new Promise((resolve, reject) => {
        const pdf = new PDFDocument({ size: "A4", margin: 56 });
        const chunks = [];

        pdf.on("data", (c) => chunks.push(c));
        pdf.on("end", () => resolve(Buffer.concat(chunks)));
        pdf.on("error", reject);

        pdf.font("Helvetica-Bold").fontSize(24).fillColor("#111111").text(doc.title);
        pdf.moveDown(0.3);
        pdf.moveTo(56, pdf.y).lineTo(539, pdf.y).strokeColor("#cccccc").stroke();
        pdf.moveDown(1);

        for (const section of doc.sections) {
            if (section.heading) {
                pdf.font("Helvetica-Bold").fontSize(15).fillColor("#222222").text(section.heading);
                pdf.moveDown(0.4);
            }
            for (const p of section.paragraphs || []) {
                pdf.font("Helvetica").fontSize(11).fillColor("#333333").text(String(p), { lineGap: 3 });
                pdf.moveDown(0.6);
            }
            for (const b of section.bullets || []) {
                pdf.font("Helvetica").fontSize(11).fillColor("#333333").text(`•  ${b}`, { indent: 10, lineGap: 3 });
                pdf.moveDown(0.2);
            }
            pdf.moveDown(0.8);
        }

        pdf.end();
    });
}

export const pdfagent = async (state) => {
    console.log("PDF AGENT CALLED with:", state.prompt.slice(0, 50));

    try {
        const llm = await getModel("pdf");

        // Memory: summary + last messages
        const { summaryText, pastMessages } = await buildContext(state.conversationId);

        const systemPrompt =
            SYSTEM_PROMPT +
            (summaryText ? `\n\nSummary of the earlier conversation:\n${summaryText}` : "");

        const response = await llm.invoke([
            { role: "system", content: systemPrompt },
            ...pastMessages,
            { role: "user", content: state.prompt },
        ]);

        const doc = parseDoc(getText(response.content));
        const buffer = await buildPdf(doc);

        const safeName = doc.title.replace(/[^a-z0-9]+/gi, "-").slice(0, 40) || "document";
        const url = await uploadFile(buffer, safeName);
        console.log("PDF uploaded to Cloudinary");

        const outline = doc.sections.map((s, i) => `${i + 1}. ${s.heading || "Section"}`).join("\n");

        return {
            ...state,
            aiResponse:
                `Your PDF is ready: **${doc.title}**\n\n` +
                `[📄 Download PDF](${url})\n\n` +
                `Sections:\n${outline}`,
        };
    } catch (err) {
        console.error("PDF agent failed:", err.message);
        return {
            ...state,
            aiResponse: "Sorry, I could not create the PDF right now. Please try again.",
            error: err.message,
        };
    }
};