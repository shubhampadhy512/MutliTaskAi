import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({
    path: path.join(__dirname, ".env"),
});


const { default: connectDB } = await import("./config/connectdb.js");
const { default: router } = await import("./routes/agent.route.js");

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use("/", router);

app.get("/", (req, res) => {
    res.send(`Agent service is ${process.env.CLOUDINARY_CLOUD_NAME}`);
});

app.listen(process.env.PORT || 8002, () => {
    console.log(`Agent service is running on port ${process.env.CLOUDINARY_API_SECRET}`);
    connectDB();
});