import express from "express";
import dotenv from "dotenv";
dotenv.config();
import proxy from "express-http-proxy";
import cors from "cors";
import { GetUser } from "./controllers/user.controller.js";
import checkUserSession from "./middlewar/auth.middlewar.js";
import cookieParser from "cookie-parser";
import { proxyWithHeader } from "./utils/proxyHeader.js"

const app = express();
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}))

app.use(cookieParser());   // must come BEFORE the routes below
app.use(express.json());


app.use("/auth", proxy(process.env.AUTH_Service_URL));
app.use("/chat", checkUserSession, proxyWithHeader(process.env.CHAT_Service_URL));
app.use("/agent", checkUserSession, proxy(process.env.AGENT_Service_URL, { limit: "35mb" }));
app.get("/getuser", checkUserSession, GetUser)

app.get("/", (req, res) => {
    res.send('Hello from gateway')
})


app.listen(process.env.PORT || 8000, () => {
    console.log(`Gateway service is running on this port ${process.env.PORT || 8000}`)
})