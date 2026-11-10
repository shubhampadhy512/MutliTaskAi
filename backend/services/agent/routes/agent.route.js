import express from "express"
import { Agent } from "../controllers/agent.controllers.js"
import { upload } from "../middleware/upload.js" // NEW

const router = express.Router()

// NEW: upload.array("files", 3) reads up to 3 files from the field named "files".
// Requests without files (normal JSON) still work the same.
router.post(
    "/chat",
    (req, res, next) => {
        upload.array("files", 3)(req, res, (err) => {
            if (err) {
                // Example: wrong file type, or file bigger than 10 MB
                return res.status(400).json({ message: err.message })
            }
            next()
        })
    },
    Agent
)

export default router