import { prop, Ref, modelOptions } from "@typegoose/typegoose";
import { Base, TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { Types } from "mongoose";
import { GraphModel } from "src/graph/graph.model";
import { PostReactionModel } from "src/postReaction/postReaction.model";
import { UserModel } from "src/user/user.model";

// Base - уникальные id 
export interface PostModel extends Base {}

// TimeStamps - даты
@modelOptions({
    schemaOptions: {
        versionKey: false  // Отключает поле _v
    }
})
export class PostModel extends TimeStamps {
    @prop({ ref: () => UserModel, index: true })
    user: Ref<UserModel>

    @prop({ ref: () => GraphModel, index: true })
    graphId: Ref<GraphModel>

    @prop ({ index: true, maxlength: 500 })
    content: string

    @prop ()
    imgPath?: string

    @prop({ type: [Types.ObjectId], ref: () => PostReactionModel })
    reactions?: Types.ObjectId[];
}