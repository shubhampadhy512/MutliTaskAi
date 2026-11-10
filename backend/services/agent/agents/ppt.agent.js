import pptxgen from "pptxgenjs";
import { getModel } from "../config/LLmModels.js";
import { buildContext } from "../config/buildContext.js";
import { uploadPpt } from "../config/cloudinary.js";

const SYSTEM_PROMPT = `You make PowerPoint slides.
Return ONLY valid JSON. No markdown. No code fences. No extra text.
Format:
{
  "title": "Presentation title",
  "subtitle": "Short subtitle",
  "slides": [
    { "title": "Slide title", "bullets": ["short point", "short point"] }
  ]
}
Rules:
- Default is 6 to 8 slides. Maximum 12.
- Each slide has 3 to 5 bullets. Each bullet is short (max 15 words).
- Write in the same language as the user.
- If the user asks to change the previous presentation, return the full updated JSON.`;

// Get JSON from the model text (even if the model adds extra words)
function parseJson(text) {
    const clean = String(text).replace(/```json|```/gi, "").trim();
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("No JSON in the model answer");
    return JSON.parse(clean.slice(start, end + 1));
}

function getText(content) {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
        return content.map((part) => part?.text || "").join("");
    }
    return String(content ?? "");
}

function makeFileName(title) {
    const slug = String(title || "presentation")
        .replace(/[^\p{L}\p{N}]+/gu, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "presentation";
    return `${slug}-${Date.now()}.pptx`;
}

async function buildPptx(data) {
    const pptx = new pptxgen();
    pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 inches

    const DARK = "1F2A44";
    const ACCENT = "6C5CE7";
    const LIGHT = "F5F6FA";

    // Title slide
    const first = pptx.addSlide();
    first.background = { color: DARK };
    first.addShape(pptx.ShapeType.rect, { x: 0.6, y: 3.0, w: 1.2, h: 0.08, fill: { color: ACCENT } });
    first.addText(data.title, {
        x: 0.6, y: 1.3, w: 12, h: 1.6,
        fontSize: 40, bold: true, color: "FFFFFF", fontFace: "Calibri", valign: "bottom",
    });
    if (data.subtitle) {
        first.addText(data.subtitle, {
            x: 0.6, y: 3.3, w: 12, h: 1,
            fontSize: 20, color: "C9CEDC", fontFace: "Calibri", valign: "top",
        });
    }

    // Content slides
    data.slides.forEach((slide, i) => {
        const s = pptx.addSlide();
        s.background = { color: LIGHT };
        s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 1.2, fill: { color: DARK } });
        s.addText(slide.title, {
            x: 0.6, y: 0.1, w: 12, h: 1,
            fontSize: 28, bold: true, color: "FFFFFF", fontFace: "Calibri", valign: "middle",
        });
        s.addText(
            slide.bullets.map((b) => ({
                text: b,
                options: { bullet: true, breakLine: true },
            })),
            {
                x: 0.8, y: 1.6, w: 11.8, h: 5.2,
                fontSize: 22, color: "222222", fontFace: "Calibri",
                valign: "top", paraSpaceAfter: 12,
            }
        );
        s.addText(String(i + 2), {
            x: 12.2, y: 6.9, w: 0.8, h: 0.4,
            fontSize: 12, color: "888888", align: "right",
        });
    });

    return await pptx.write({ outputType: "nodebuffer" });
}

export const pptagent = async (params) => {
    const { prompt, conversationId } = params;

    // Memory (so follow-ups like "add one more slide" work)
    const { summaryText, pastMessages } = await buildContext(conversationId);
    const history = (pastMessages || [])
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");

    const model = await getModel("ppt");
    const result = await model.invoke([
        {
            role: "system",
            content:
                SYSTEM_PROMPT +
                (String(prompt).includes("[ATTACHED FILE CONTENT")
                    ? "\n\nThe user attached a file. Its real text is inside [ATTACHED FILE CONTENT] in the user request. " +
                    "Use ONLY this text as the source. Apply ONLY the change the user asks for and keep all other content the same. " +
                    "Return the FULL presentation as JSON."
                    : ""),
        },
        {
            role: "user",
            content:
                `${summaryText ? `Summary of the chat:\n${summaryText}\n\n` : ""}` +
                `${history ? `Recent messages:\n${history}\n\n` : ""}` +
                `User request:\n${prompt}`,
        },
    ]);

    const data = parseJson(getText(result.content));

    // Safety checks
    data.title = String(data.title || "Presentation");
    data.slides = (Array.isArray(data.slides) ? data.slides : [])
        .slice(0, 12)
        .map((s) => ({
            title: String(s?.title || "Slide"),
            bullets: (Array.isArray(s?.bullets) ? s.bullets : []).map(String).slice(0, 6),
        }));
    if (data.slides.length === 0) throw new Error("The model made no slides");

    const buffer = await buildPptx(data);
    const fileName = makeFileName(data.title);
    const url = await uploadPpt(buffer, fileName, "multitask-ai/ppt");

    const list = data.slides.map((s, i) => `${i + 1}. ${s.title}`).join("\n");
    const reply =
        `Your PPT is ready: **${data.title}**\n\n` +
        `[📊 Download PPT](${url})\n\n` +
        `Slides:\n${list}`;

    return { aiResponse: reply, agent: "ppt" };
};