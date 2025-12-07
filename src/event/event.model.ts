import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EventDocument = EventModel & Document;

@Schema({
    collection: 'Event',
    timestamps: false, // Отключает поля createdAt и updatedAt
    versionKey: false  // Отключает поле _v
})
export class EventModel {
    _id: Types.ObjectId;

    // КГТУ / КБК / Калининград
    @Prop({ type: Types.ObjectId, ref: 'GraphModel', required: true, index: true })
    globalGraphId: Types.ObjectId;
    
    // Граф тематики (Юмор) - нужно, если нет graphId
    @Prop({ type: Types.ObjectId, ref: 'GraphModel', required: false, index: true })
    parentGraphId?: Types.ObjectId;

    // Граф, на котором проводится мероприятие (группа)
    @Prop({ type: Types.ObjectId, ref: 'GraphModel', required: true, index: true })
    graphId: Types.ObjectId;

    @Prop({ required: true })
    name: string;

    @Prop({ maxlength: 150 })
    place: string;

    @Prop()
    price?: number;

    @Prop()
    imgPath?: string;

    @Prop({ maxlength: 300 })
    description: string;

    @Prop()
    eventDate?: Date; // Дата мероприятия

    @Prop({ default: false })
    isDateTbd: boolean; // Статус: дата уточняется

    @Prop()
    timeFrom?: string; // Время начала

    @Prop()
    timeTo: string; // Время окончания

    @Prop({ default: 0 })
    regedUsers: number

    @Prop({ enum: ["city", "university"], required: false, index: true })
    type?: "city" | "university";
}

export const EventSchema = SchemaFactory.createForClass(EventModel);
