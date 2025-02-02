import { Controller, Post, Body, Get, Query } from "@nestjs/common";
import { EventService } from "./event.service";

@Controller("event")
export class EventController {
    constructor(private readonly eventService: EventService) {}

     // --- Создание мероприятия ---
    @Post("create")
    async createEvent(@Body() body: { graphId: string; name: string; description: string; eventDate: string; timeFrom: string; timeTo: string }) {
        return this.eventService.createEvent(body.graphId, body.name, body.description, new Date(body.eventDate), body.timeFrom, body.timeTo);
    }

    // --- Получение мероприятий для определённого графа ---
    @Get("by-graph")
    async getEventsByGraphId(@Query("graphId") graphId: string) {
        return this.eventService.getEventsByGraphId(graphId);
    }

    // --- Получение мероприятий на ближайшее время ---
    @Get("upcoming")
    async getUpcomingEvents() {
        return this.eventService.getUpcomingEvents();
    }
}
