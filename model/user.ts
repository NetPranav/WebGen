import mongoose,{Schema} from "mongoose";

const UserSchema = new Schema({
    name:{
        required:[true,"Name is required"],
        type:Schema.Types.String,
    },
    email:{
        required:[true,"email is required"],
        type:Schema.Types.String,
        unique:true,
        trim:true
    },
    password:{
        required:false,
        type:Schema.Types.String,
    }
});

export const User = mongoose.models.User || mongoose.model("User",UserSchema);