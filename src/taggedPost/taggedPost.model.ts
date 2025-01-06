import { prop, Ref, modelOptions } from '@typegoose/typegoose'
import { Base, TimeStamps } from '@typegoose/typegoose/lib/defaultClasses'
import { PostModel } from 'src/post/post.model'
import { PostTagModel } from 'src/postTag/postTag.model'

// Base - уникальные id 
export interface TaggedPostModel extends Base {}

// TimeStamps - даты
@modelOptions({
    schemaOptions: {
        timestamps: false, // Отключает поля createdAt и updatedAt
        versionKey: false  // Отключает поле _v
    }
})
export class TaggedPostModel extends TimeStamps {
    @prop({ index: true, ref: () => PostModel })
    postId: Ref<PostModel>

    @prop({ index: true, ref: () => PostTagModel })
    postTagId: Ref<PostTagModel>
}



