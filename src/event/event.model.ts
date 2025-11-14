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
    // КГТУ / КБК / Калининград
    @prop({ ref: () => GraphModel, required: true, index: true })
    globalGraphId: Ref<GraphModel>;
    
    // Граф тематики (Юмор) - нужно, если нет graphId
    @prop({ ref: () => GraphModel, required: false, index: true })
    parentGraphId?: Ref<GraphModel>;

    // Граф, на котором проводится мероприятие (группа)
    @prop({ ref: () => GraphModel, required: true, index: true })
    graphId: Ref<GraphModel>;

    @prop({ required: true })
    name: string;

    @prop({ maxlength: 150 })
    place: string;

    @prop()
    price?: number;

    @prop()
    imgPath?: string;

    @prop({ maxlength: 300 })
    description: string;

    @prop()
    eventDate?: Date; // Дата мероприятия

    @prop({ default: false })
    isDateTbd: boolean; // Статус: дата уточняется

    @prop()
    timeFrom?: string; // Время начала

    @prop()
    timeTo: string; // Время окончания

    @prop({ default: 0 })
    regedUsers: number

    @prop({ enum: ["city", "university"], required: false, index: true })
    type?: "city" | "university";
}
