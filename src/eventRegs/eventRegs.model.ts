import { prop, Ref, modelOptions } from '@typegoose/typegoose'
import { Base, TimeStamps } from '@typegoose/typegoose/lib/defaultClasses'
import { EventModel } from 'src/event/event.model'
import { UserModel } from 'src/user/user.model'

// Base - уникальные id 
export interface EventRegsModel extends Base {}

@modelOptions({
    schemaOptions: {
        timestamps: false, // Отключает поля createdAt и updatedAt
        versionKey: false  // Отключает поле _v
    }
})
// TimeStamps - даты
export class EventRegsModel extends TimeStamps {
    // Кто подписался 
    @prop({ ref: () => UserModel, index: true })
    userId: Ref<UserModel>

    // На какое мероприятие записались
    @prop({ ref: () => EventModel, index: true })
    eventId: Ref<EventModel>

}


