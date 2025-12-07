import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ScheduleDocument = ScheduleModel & Document;

export enum ScheduleType {
    LECTURE = 'lecture',
    PRACTICE = 'practice',
}

@Schema({
    collection: 'Schedule',
    timestamps: false, // Отключает поля createdAt и updatedAt
    versionKey: false  // Отключает поле _v
})
export class ScheduleModel {
    _id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'GraphModel', index: true })
    graphId: Types.ObjectId

    @Prop({ required: true })
    name: string

    @Prop({ required: true, enum: ScheduleType })
    type: string;

    @Prop({ required: true })
    roomNumber: string;

    @Prop({ required: true, min: 0, max: 6 }) // 0 - Понедельник, 6 - Воскресенье
    dayOfWeek: number;

    @Prop({ required: true }) // Время проведения С
    timeFrom: string;

    @Prop({ required: false }) // Время проведения ДО
    timeTo: string;
}

export const ScheduleSchema = SchemaFactory.createForClass(ScheduleModel);