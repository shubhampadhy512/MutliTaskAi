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
    content:String,
    artifact:{
        title:String,
        language:String,
        code:String,
        previewable:Boolean
    }
},{timestamps:true})

const Message = mongoose.model("Message",messageSchema)

export default Message