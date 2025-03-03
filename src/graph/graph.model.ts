import { modelOptions, prop, Ref } from "@typegoose/typegoose";
import { Base, TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { UserModel } from "src/user/user.model";

// Base - уникальные id 
export interface GraphModel extends Base {}

// TimeStamps - даты
@modelOptions({
    schemaOptions: {
        timestamps: false, // Отключает поля createdAt и updatedAt
        versionKey: false  // Отключает поле _v
    }
})
export class GraphModel extends TimeStamps {
    @prop()
    name: string

    @prop ({ index: true, maxlength: 200 })
    about?: string

    @prop({ ref: () => UserModel, index: true })
    ownerUserId: Ref<UserModel>; 

    // Количество подписчиков на граф
    @prop({ default: 0 })
    subsNum: number

    @prop({ ref: () => GraphModel, index: true })
    parentGraphId?: Ref<GraphModel>; 

    @prop({ default: 0 })
    childGraphNum: number;

    @prop ()
    imgPath?: string
}


