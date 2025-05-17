import { modelOptions, prop, Ref, index } from "@typegoose/typegoose";
import { Base, TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { GraphModel } from "src/graph/graph.model";
import { UserModel } from "src/user/user.model";

// Base - уникальные id 
export interface GraphSubsModel extends Base {}

// TimeStamps - даты
@modelOptions({
    schemaOptions: {
        timestamps: false, // Отключает поля createdAt и updatedAt
        versionKey: false,  // Отключает поле _v
    }
})

// Составной индекс для оптимизации поиска по обоим полям
@index({ user: 1, graph: 1 })

export class GraphSubsModel extends TimeStamps {
    @prop({ ref: () => UserModel, index: true })
    user: Ref<UserModel>

    @prop({ ref: () => GraphModel, index: true })
    graph: Ref<GraphModel>

}


