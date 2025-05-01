import { modelOptions, prop, Ref } from "@typegoose/typegoose";
import { Base, TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { GraphModel } from "src/graph/graph.model";

// Base - уникальные id 
export interface ScheduleModel extends Base {}

export enum ScheduleType {
    LECTURE = 'lecture',
    PRACTICE = 'practice',
}

@modelOptions({
    schemaOptions: {
        timestamps: false, // Отключает поля createdAt и updatedAt
        versionKey: false  // Отключает поле _v
    }
})
export class ScheduleModel extends TimeStamps {
    @prop({ ref: () => GraphModel, index: true })
    graphId: Ref<GraphModel>

    @prop({ required: true })
    name: string

    @prop({ required: true, enum: ScheduleType })
    type: string;

    @prop({ required: true })
    roomNumber: number;

    @prop({ required: true, min: 0, max: 6 }) // 0 - Понедельник, 6 - Воскресенье
    dayOfWeek: number;

    @prop({ required: true }) // Время проведения (например, '14:00')
    timeFrom: string;

    @prop({ required: false }) // Время проведения (до, '15:40')
    timeTo: string;
}