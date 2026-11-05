import express from "express"
import { Agent } from "../controllers/agent.controllers.js"

const router = express.Router()

router.post("/chat",Agent)

export default router