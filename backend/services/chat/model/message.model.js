import mongoose from "mongoose";

const messageSchema = await mongoose.Schema({
    conversationId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Conversation'
    },
    role:{
        type:String,
        enum:['user','ai']
    },
    content:String
},{timestamps:true})

const Message = mongoose.model("Message",messageSchema)

export default Message