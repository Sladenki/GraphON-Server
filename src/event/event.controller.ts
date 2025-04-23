import { Controller, Post, Body, Get, Query } from "@nestjs/common";
import { EventService } from "./event.service";
import { CreateEventDto } from "./dto/event.dto";

@Controller("event")
export class EventController {
    constructor(private readonly eventService: EventService) {}

     // --- Создание мероприятия ---
    @Post("create")
    async createEvent(
        @Body() body: CreateEventDto
    ) {
        return this.eventService.createEvent(body);
    }

    // --- Получение мероприятий для определённого графа ---
    @Get("by-graph")
    async getEventsByGraphId(
        @Query("graphId") graphId: string
    ) {
        return this.eventService.getEventsByGraphId(graphId);
    }

    // --- Получение мероприятий на ближайшее время ---
    @Get("upcoming")
    async getUpcomingEvents() {
        return this.eventService.getUpcomingEvents();
    }
}
