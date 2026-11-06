import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// This file is in "config", so ".." goes up to the agent folder
const LOGO_FILE = path.join(__dirname, "..", "assest", "image.png");

// Logo settings. You can change these numbers.
const LOGO_WIDTH = 100; // logo size in pixels
const MARGIN = 20;      // space from the corner

export async function addLogo(imageDataUrl) {
    // 1. Turn the image text (base64) into real image data
    const base64Part = imageDataUrl.split(",")[1];
    const imageBuffer = Buffer.from(base64Part, "base64");

    // 2. Find the size of the image
    const info = await sharp(imageBuffer).metadata();

    // 3. Make the logo smaller
    const logoBuffer = await sharp(LOGO_FILE)
        .resize({ width: LOGO_WIDTH })
        .toBuffer();
    const logoInfo = await sharp(logoBuffer).metadata();

    // 4. Put the logo in the bottom right corner
    const finalBuffer = await sharp(imageBuffer)
        .composite([
            {
                input: logoBuffer,
                left: info.width - logoInfo.width - MARGIN,
                top: info.height - logoInfo.height - MARGIN,
            },
        ])
        .png({ quality: 90 })
        .toBuffer();

    // 5. Turn it back into the same text format
    return "data:image/png;base64," + finalBuffer.toString("base64");
}