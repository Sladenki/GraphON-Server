import { prop, Ref, modelOptions } from '@typegoose/typegoose'
import { Base, TimeStamps } from '@typegoose/typegoose/lib/defaultClasses'
import { PostModel } from 'src/post/post.model';

// Base - уникальные id 
export interface PostReactionModel extends Base {}

export enum Emoji {
    LIKE = '👍',
    LOVE = '❤️',
    SHARP = '😎',
    WOW = '😮',
    SMILE = '😁',
    EXOLIDING_HEAD = '🤯',
}

// TimeStamps - даты
@modelOptions({
    schemaOptions: {
        timestamps: false, // Отключает поля createdAt и updatedAt
        versionKey: false  // Отключает поле _v
    }
})
export class PostReactionModel extends TimeStamps {
    @prop({ maxlength: 10 })
    text?: string

    @prop({ enum: Emoji })
    emoji?: Emoji;

    @prop({ default: 0})
    clickNum: number

    @prop({ ref: () => PostModel, index: true })
    post: Ref<PostModel>
}



