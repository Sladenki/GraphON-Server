import { prop } from "@typegoose/typegoose";
import { Base, TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { Types } from "mongoose";

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
    followersNum: number  // подписчики

    @prop({ default: 0 })
    subsNum: number  // подписки

    @prop({ default: 0 })
    postsNum: number 
}