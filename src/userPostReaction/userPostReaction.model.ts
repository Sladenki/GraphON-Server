import { prop, Ref, modelOptions } from '@typegoose/typegoose'
import { Base, TimeStamps } from '@typegoose/typegoose/lib/defaultClasses'
import { PostReactionModel } from 'src/postReaction/postReaction.model'
import { UserModel } from 'src/user/user.model'

// Base - уникальные id 
export interface UserPostReactionModel extends Base {}


// TimeStamps - даты
@modelOptions({
    schemaOptions: {
        timestamps: false, // Отключает поля createdAt и updatedAt
        versionKey: false  // Отключает поле _v
    }
})
export class UserPostReactionModel extends TimeStamps {
    @prop({ ref: () => PostReactionModel, index: true })
    postReaction: Ref<PostReactionModel>

    @prop({ ref: () => UserModel, index: true })
    user: Ref<UserModel>
}



