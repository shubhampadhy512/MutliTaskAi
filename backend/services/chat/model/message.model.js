import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        conversationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Conversation",
        },
        role: {
            type: String,
            enum: ["user", "ai"],
        },
        content: String,
        artifact: {
            title: String,
            language: String,
            code: String,
            previewable: Boolean,
        },
        image: {
            type: String, // image URL (recommended) or base64 data URL
            default: null,
        },
    },
    { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;