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