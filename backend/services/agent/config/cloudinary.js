import { v2 as cloudinary } from "cloudinary";
export async function uploadImage(dataUrl) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const result = await cloudinary.uploader.upload(dataUrl, {
        folder: "multitask-ai",
        resource_type: "image",
    });

    return result.secure_url;
}