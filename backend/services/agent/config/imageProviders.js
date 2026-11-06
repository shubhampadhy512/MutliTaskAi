const CF_URL = (model) =>
    `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/ai/run/${model}`;

// Cloudflare returns JSON (base64) for some models and raw image bytes for others
async function cloudflareImage(prompt, model = "@cf/black-forest-labs/flux-1-schnell") {
    const body = model.includes("flux") ? { prompt, steps: 4 } : { prompt };

    const res = await fetch(CF_URL(model), {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.CF_API_TOKEN}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Cloudflare ${res.status}: ${await res.text()}`);

    const type = res.headers.get("content-type") || "";
    if (type.includes("application/json")) {
        const json = await res.json();
        const b64 = json?.result?.image;
        if (!b64) throw new Error("Cloudflare returned no image");
        return `data:image/jpeg;base64,${b64}`;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:image/png;base64,${buf.toString("base64")}`;
}

async function huggingFaceImage(prompt) {
    const res = await fetch(
        "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.HF_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ inputs: prompt }),
        }
    );
    if (!res.ok) throw new Error(`HuggingFace ${res.status}: ${await res.text()}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:image/png;base64,${buf.toString("base64")}`;
}

// Tried in order until one works
export const imageProviders = [
    { name: "cloudflare-flux", run: (p) => cloudflareImage(p) },
    { name: "cloudflare-sdxl", run: (p) => cloudflareImage(p, "@cf/bytedance/stable-diffusion-xl-lightning") },
    { name: "huggingface-flux", run: huggingFaceImage },
];