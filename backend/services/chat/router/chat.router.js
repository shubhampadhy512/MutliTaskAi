import express from "express"
import {
    createConversation,
    getConversation,
    getMessage,
    saveMessage,
    updateConversation
} from "../controller/chart.controller.js"

const router = express.Router();

router.get("/create-conversation", createConversation)
router.get("/get-conversation", getConversation)
router.post("/update-message", updateConversation)
router.post("/save-message", saveMessage)
router.post("/get-message", getMessage)

export default router

