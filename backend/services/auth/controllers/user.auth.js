import asyncHandler from "../utils/asyncHandler.js";
import { getAuth } from "firebase-admin/auth";
import { app } from "../config/firebase.js";
import User from "../model/user.model.js";
import crypto from "crypto";
import redis from "../../../shared/redis/redis.js";

export const SignInWithGoogle = asyncHandler(async (req, res) => {
    const { token } = req.body;
    const decode = await getAuth(app).verifyIdToken(token);
    const { uid, name, email, picture } = decode;
    let user = await User.findOne({ firebaseId: uid });
    if (!user) {
        user = await User.create({
            firebaseId: uid,
            name,
            email,
            avatar: picture
        })
    }
    const sessionId = crypto.randomUUID();

    await redis.set(`session-${sessionId}`, JSON.stringify({
        userId: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar
    }), "EX", 7 * 24 * 60 * 60);

    res.cookie("session", sessionId, {
        httpOnly: true,
        secure: process.env.SESSION_NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    res.status(200).json({
        success: true,
        user
    });
})

export const Logout = asyncHandler(async (req, res) => {
    console.log("Raw Cookie:", req.headers.cookie);
    console.log("Parsed Cookies:", req.cookies);
    const sessionId = req.cookies.session;
    console.log(req.cookies)
    await redis.del(`session-${sessionId}`);
    res.clearCookie("session");
    return res.status(200).json({
        message: "Logout successfully"
    })
})
