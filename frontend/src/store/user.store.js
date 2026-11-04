import {configureStore } from "@reduxjs/toolkit"
import userInfo from "../feature/user.js"

export const store = configureStore({
    reducer:{
        user : userInfo
    }
})