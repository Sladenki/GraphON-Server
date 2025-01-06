import { prop, Ref } from '@typegoose/typegoose'
import { Base, TimeStamps } from '@typegoose/typegoose/lib/defaultClasses'
import { UserModel } from 'src/user/user.model'

// Base - уникальные id 
export interface userSubsModel extends Base {}

// TimeStamps - даты
export class userSubsModel extends TimeStamps {
    // Тот кто подписался 
    @prop({ ref: () => UserModel, index: true })
    fromUser: Ref<UserModel>

    // На кого подписались
    @prop({ ref: () => UserModel, index: true })
    toUser: Ref<UserModel>

}



