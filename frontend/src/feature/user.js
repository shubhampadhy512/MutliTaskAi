import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    userId: null,
    name: null,
    email: null,
    avatar: null,
};

export const User = createSlice({
    name: "userinfo",
    initialState,
    reducers: {
        UserInfo: (state, action) => {
            state.userId = action.payload.userId;
            state.name = action.payload.name;
            state.email = action.payload.email;
            state.avatar = action.payload.avatar;
        },
        resetRole: (state) => {
            Object.keys(state).forEach((key) => {
                state[key] = null;
            })
        }
    }
})

export const { UserInfo, resetRole } = User.actions;

export default User.reducer;