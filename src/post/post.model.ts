import { prop, Ref, modelOptions } from "@typegoose/typegoose";
import { Base, TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { GraphModel } from "src/graph/graph.model";
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

    @prop ({ index: true })
    content: string

    @prop ()
    imgPath?: string

    @prop({ ref: () => GraphModel, index: true })
    graphId: Ref<GraphModel>
}