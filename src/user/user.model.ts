import { prop } from "@typegoose/typegoose";
import { Base, TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";

// Base - уникальные id 
export interface UserModel extends Base {}

export class UserModel extends TimeStamps {
    @prop ({ unique: true, index: true })
    email: string

    @prop()
    name: string

    @prop()
    avaPath: string

    @prop({ default: 0 })
    subsNum: number  // подписки на граф

    @prop({ default: 0 })
    postsNum: number 
}