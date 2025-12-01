import { prop, Ref, modelOptions } from '@typegoose/typegoose';
import { Base, TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';
import { UserModel } from 'src/user/user.model';

// Base - уникальные id 
export interface RequestsConnectedGraphModel extends Base {}

@modelOptions({
    schemaOptions: {
        timestamps: true, // Включает поля createdAt и updatedAt
        versionKey: false  // Отключает поле _v
    }
})
export class RequestsConnectedGraphModel extends TimeStamps {
    // Пользователь, который сделал запрос (опционально, если пользователь не авторизован)
    @prop({ ref: () => UserModel, required: false, index: true })
    userId?: Ref<UserModel>;

    // Название вуза
    @prop({ required: true })
    university: string;
}

