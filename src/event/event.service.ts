import { Injectable } from "@nestjs/common";
import { InjectModel } from '@m8a/nestjs-typegoose';
import { EventModel } from "./event.model";
import { ModelType } from "@typegoose/typegoose/lib/types";
import { CreateEventDto } from "./dto/event.dto";
import { Types } from "mongoose";

@Injectable()
export class EventService {
    constructor(
        @InjectModel(EventModel) 
        private readonly EventModel: ModelType<EventModel>
    ) {}

    // --- Создание мероприятия ---
    async createEvent(dto: CreateEventDto) {
        return this.EventModel.create({ 
            ...dto,
            eventDate: new Date(dto.eventDate)
        });
    }

    // --- Получение мероприятий для определённого графа ---
    async getEventsByGraphId(graphId: string) {
        return this.EventModel
            .find({ graphId })
            .populate("graphId", "name")
            .lean();
    }

    // Получение мероприятий массива графов
    async getEventsByGraphsIds(graphIds: string[]) {
        return this.EventModel
            .find({
                graphId: { $in: graphIds },
               
            })
            .populate("graphId", "name")
            .lean();
    }

    // --- Получение мероприятий на ближайшее время ---
    async getUpcomingEvents(globalGraphId: string) {
        const today = new Date();
        return this.EventModel
            .find({ eventDate: { $gte: today }, globalGraphId: globalGraphId })
            .sort({ eventDate: 1 })
            .populate("graphId", "name")
            .lean();
    }

    // --- Удаление мероприятия ---
    async deleteEvent(eventId: string | Types.ObjectId) {
        return this.EventModel.findByIdAndDelete(eventId).lean();
    }

    // --- Редактирование мероприятия ---
    async updateEvent(eventId: string | Types.ObjectId, dto: CreateEventDto) {
        return this.EventModel
            .findByIdAndUpdate(
                eventId,
                { 
                    ...dto,
                    eventDate: new Date(dto.eventDate)
                },
                { new: true }
            )
            .populate("graphId", "name")
            .lean();
    }
}
