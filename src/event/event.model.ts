import { modelOptions, prop, Ref } from "@typegoose/typegoose";
import { Base, TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { GraphModel } from "src/graph/graph.model";

// Base - уникальные id 
export interface EventModel extends Base {}

@modelOptions({
    schemaOptions: {
        timestamps: false, // Отключает поля createdAt и updatedAt
        versionKey: false  // Отключает поле _v
    }
})
export class EventModel extends TimeStamps {
    @prop({ ref: () => GraphModel, required: true, index: true })
    graphId: Ref<GraphModel>;

    @prop({ ref: () => GraphModel, required: true, index: true })
    globalGraphId: Ref<GraphModel>;

    @prop({ required: true })
    name: string;

    @prop({ maxlength: 150 })
    description: string;

    @prop({ required: true })
    eventDate: Date; // Дата мероприятия

    @prop({ required: true })
    timeFrom: string; // Время начала

    @prop()
    timeTo: string; // Время окончания

    @prop({ default: 0 })
    regedUsers: number
}
