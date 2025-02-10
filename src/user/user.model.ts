import { prop } from "@typegoose/typegoose";
import { Base, TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";

// Base - уникальные id 
export interface UserModel extends Base {}

export class UserModel extends TimeStamps {
    @prop ({ unique: false })
    email: string

    @prop()
    firstName: string

    @prop()
    lastName: string

    @prop()
    username: string

    @prop()
    avaPath: string

    @prop()
    telegramId: any

    @prop({ default: 0 })
    // subsNum: number  // подписки на граф
    graphSubsNum: number

    @prop({ default: 0 })
    postsNum: number 
}