import { v2 as cloudinary } from "cloudinary";

function configure() {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
}

export async function uploadImage(dataUrl) {
    configure();
    try {
        const result = await cloudinary.uploader.upload(dataUrl, {
            folder: "multitask-ai",
            resource_type: "image",
        });
        return result.secure_url;
    } catch (err) {
        // Show the real reason (short, no big data)
        console.error(
            "Cloudinary detail:",
            err.http_code,
            err.error?.message || err.message
        );
        throw err;
    }
}

// Upload a PDF file (used by the PDF agent)
export function uploadFile(buffer, filename) {
    configure();
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: "multitask-ai/pdf",
                resource_type: "raw",
                public_id: `${filename}-${Date.now()}.pdf`,
            },
            (err, result) => (err ? reject(err) : resolve(result.secure_url))
        );
        stream.end(buffer);
    });
}

// Upload a PowerPoint file (used by the PPT agent). The name must end with .pptx
export function uploadPpt(buffer, fileName) {
    configure();
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: "multitask-ai/ppt",
                resource_type: "raw",
                public_id: fileName, // keeps the .pptx ending
                use_filename: false,
                unique_filename: false,
                overwrite: true,
            },
            (err, result) => (err ? reject(err) : resolve(result.secure_url))
        );
        stream.end(buffer);
    });
}

// Upload a file that the USER attached. Returns { name, type, url }
export function uploadAttachment(buffer, originalName, mimeType) {
    configure();

    const isImage = String(mimeType).startsWith("image/");
    const lower = String(originalName).toLowerCase();
    const type = isImage ? "image" : lower.endsWith(".pdf") ? "pdf" : "ppt";

    const safe = String(originalName).replace(/[^\w.\-]+/g, "-");
    const base = safe.replace(/\.[^.]+$/, "") || "file";
    const ext = safe.includes(".") ? safe.split(".").pop().toLowerCase() : "";

    // images: Cloudinary adds the extension. PDF/PPT (raw): keep the extension in the name.
    const publicId = isImage ? `${base}-${Date.now()}` : `${base}-${Date.now()}.${ext}`;

    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: "multitask-ai/user-files",
                resource_type: isImage ? "image" : "raw",
                public_id: publicId,
            },
            (err, result) =>
                err ? reject(err) : resolve({ name: originalName, type, url: result.secure_url })
        );
        stream.end(buffer);
    });
}