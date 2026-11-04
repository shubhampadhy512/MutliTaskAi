
import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]); import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/connectdb.js";
import router from "./router/auth.router.js";
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/', router);


app.get('/', (req, res) => {
    res.send("Auth Service is running")
})

app.listen(process.env.PORT || 8001, () => {
    console.log(`Auth service is running on this port ${process.env.PORT || 8001}`)
    connectDB();
})