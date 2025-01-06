import { prop, modelOptions } from '@typegoose/typegoose'
import { Base, TimeStamps } from '@typegoose/typegoose/lib/defaultClasses'

// Base - уникальные id 
export interface PostTagModel extends Base {}

// TimeStamps - даты
@modelOptions({
    schemaOptions: {
        timestamps: false, // Отключает поля createdAt и updatedAt
        versionKey: false  // Отключает поле _v
    }
})
export class PostTagModel extends TimeStamps {
    @prop({ index: true, unique: true })
    name: string

    @prop()
    postsNum: number
}



