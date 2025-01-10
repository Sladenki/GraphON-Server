import { modelOptions, prop, Ref } from "@typegoose/typegoose";
import { Base, TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { GraphModel } from "src/graph/graph.model";
import { UserModel } from "src/user/user.model";

// Base - уникальные id 
export interface GraphSubsModel extends Base {}

// TimeStamps - даты
@modelOptions({
    schemaOptions: {
        timestamps: false, // Отключает поля createdAt и updatedAt
        versionKey: false  // Отключает поле _v
    }
})
export class GraphSubsModel extends TimeStamps {
    @prop({ ref: () => UserModel, index: true })
    user: Ref<UserModel>

    @prop({ ref: () => GraphModel, index: true })
    graph: Ref<GraphModel>

}


