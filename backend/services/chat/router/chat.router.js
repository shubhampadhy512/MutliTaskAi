import express from "express"
import {
    createConversation,
    getConversation,
    getMessage,
    saveMessage,
    updateConversation,
    deleteConversation,
    updateMessage
} from "../controller/chart.controller.js"

const router = express.Router();

router.get("/create-conversation", createConversation)
router.get("/get-conversation", getConversation)
router.get("/delete-conversation/:id", deleteConversation)
router.post("/update-message", updateConversation)
router.post("/save-message", saveMessage)
router.post("/get-message", getMessage)
router.post("/updatemessage", updateMessage)


export default router
