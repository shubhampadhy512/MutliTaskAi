import axios from "axios";

export const getMessage = async (conversationId) => {
    try {
        const res = await axios.post(
            `${process.env.CHAT_Service_URL}/get-message`,
            { conversationId }
        );
        return res.data; // array of messages
    } catch (err) {
        console.error("getMessage failed:", err.message, err.response?.status);
        return null;
    }
};