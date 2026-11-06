import "dotenv/config";
import fs from "fs";
import { imageProviders } from "./config/imageProviders.js";

for (const p of imageProviders) {
    try {
        const dataUrl = await p.run("a glowing golden diya lamp at night, rangoli, marigold flowers, no text");
        fs.writeFileSync("test.png", Buffer.from(dataUrl.split(",")[1], "base64"));
        console.log(`✅ ${p.name} worked → saved test.png`);
        break;
    } catch (e) {
        console.log(`❌ ${p.name} failed:`, e.message);
    }
}