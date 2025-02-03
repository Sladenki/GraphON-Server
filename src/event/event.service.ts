import { Injectable } from "@nestjs/common";
import { InjectModel } from '@m8a/nestjs-typegoose';
import { EventModel } from "./event.model";
import { ModelType } from "@typegoose/typegoose/lib/types";


@Injectable()
export class EventService {
    constructor(
        @InjectModel(EventModel) 
        private readonly EventModel: ModelType<EventModel>
    ) {}

    // --- Создание мероприятия ---
    async createEvent(graphId: string, name: string, description: string, eventDate: Date, timeFrom: string, timeTo: string) {
        return this.EventModel.create({ 
            graphId, name, description, eventDate, timeFrom, timeTo 
        });
    }

    // --- Получение мероприятий для определённого графа ---
    async getEventsByGraphId(graphId: string) {
        return this.EventModel
            .find({ graphId })
            .populate("graphId", "name")
            .lean();
    }

    // --- Получение мероприятий на ближайшее время ---
    async getUpcomingEvents() {
        const today = new Date();
        return this.EventModel
            .find({ eventDate: { $gte: today } })
            .sort({ eventDate: 1 })
            .populate("graphId", "name")
            .lean();
    }
}
