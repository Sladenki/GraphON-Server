import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EventRegsDocument = EventRegsModel & Document;

@Schema({
    collection: 'EventRegs',
    timestamps: false, // Отключает поля createdAt и updatedAt
    versionKey: false  // Отключает поле _v
})
export class EventRegsModel {
    _id: Types.ObjectId;

    // Кто подписался 
    @Prop({ type: Types.ObjectId, ref: 'UserModel', index: true })
    userId: Types.ObjectId

    // На какое мероприятие записались
    @Prop({ type: Types.ObjectId, ref: 'EventModel', index: true })
    eventId: Types.ObjectId

}

export const EventRegsSchema = SchemaFactory.createForClass(EventRegsModel);


