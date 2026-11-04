import mongoose from "mongoose";

const conversationSchema = await mongoose.Schema({
    title:{
        type:String,
        default:'New Chat'
    },
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
},{
    timestamps:true
})

const Conversation = mongoose.model("Conversation",conversationSchema)

export default Conversation