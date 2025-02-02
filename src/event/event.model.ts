import { prop, Ref } from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { GraphModel } from "src/graph/graph.model";

export class EventModel extends TimeStamps {
    @prop({ ref: () => GraphModel, required: true, index: true })
    graphId: Ref<GraphModel>;

    @prop({ required: true })
    name: string;

    @prop({ required: true })
    description: string;

    @prop({ required: true })
    eventDate: Date; // Дата мероприятия

    @prop({ required: true })
    timeFrom: string; // Время начала

    @prop({ required: true })
    timeTo: string; // Время окончания
}
