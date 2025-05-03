import { Controller, Post, Body, Get, Query, UseGuards, Delete, Param } from "@nestjs/common";
import { EventService } from "./event.service";
import { CreateEventDto } from "./dto/event.dto";
import { EventRegsService } from "src/eventRegs/eventRegs.service";
import { JwtAuthGuard } from "src/jwt/jwt-auth.guard";
import { OptionalAuthGuard } from "src/guards/optionalAuth.guard";
import { GetOptionalAuthContext } from "src/decorators/optional-auth-context.decorator";
import { OptionalAuthContext } from "src/interfaces/optional-auth.interface";
import { OptionalAuth } from "src/decorators/optionalAuth.decorator";
import { Auth } from "src/decorators/auth.decorator";

@Controller("event")
export class EventController {
    constructor(
        private readonly eventService: EventService,
        private readonly eventRegsService: EventRegsService
    ) {}

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
    @UseGuards(JwtAuthGuard, OptionalAuthGuard)
    @OptionalAuth()
    async getUpcomingEvents(
        @GetOptionalAuthContext() authContext: OptionalAuthContext
    ) {
        const events = await this.eventService.getUpcomingEvents();
        
        // Если пользователь авторизован, проверяем посещаемость
        if (authContext.isAuthenticated) {
            const eventsWithAttendance = await Promise.all(
                events.map(async (event) => {
                    const isAttended = await this.eventRegsService.isUserAttendingEvent(authContext.userId, event._id);
                    return {
                        ...event,
                        isAttended
                    };
                })
            );
            return eventsWithAttendance;
        }

        // Если пользователь не авторизован, возвращаем мероприятия без проверки посещаемости
        return events;
    }

    // --- Удаление мероприятия ---
    @Delete(":eventId")
    @Auth()
    async deleteEvent(
        @Param("eventId") eventId: string
    ) {
        return this.eventService.deleteEvent(eventId);
    }
}
