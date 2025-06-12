import { Controller, Post, Body, Get, Query, UseGuards, Delete, Param, Put } from "@nestjs/common";
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
    @UseGuards(JwtAuthGuard)
    @Post("create")
    async createEvent(
        @Body() body: CreateEventDto
    ) {
        return this.eventService.createEvent(body);
    }

    // --- Получение мероприятий для определённого графа ---
    @Get("by-graph/:graphId")
    async getEventsByGraphId(
        @Param("graphId") graphId: string
    ) {
        return this.eventService.getEventsByGraphId(graphId);
    }

    // --- Получение мероприятий на ближайшее время ---
    @Get("upcoming/:selectedGraphId")
    @UseGuards(JwtAuthGuard, OptionalAuthGuard)
    @OptionalAuth()
    async getUpcomingEvents(
        @GetOptionalAuthContext() authContext: OptionalAuthContext,
        @Param("selectedGraphId") globalGraphId: string
    ) {
        const events = await this.eventService.getUpcomingEvents(globalGraphId);

        // console.log(events);
        
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
    @UseGuards(JwtAuthGuard)
    @Delete(":eventId")
    @Auth()
    async deleteEvent(
        @Param("eventId") eventId: string
    ) {
        return this.eventService.deleteEvent(eventId);
    }

    // --- Редактирование мероприятия ---
    @UseGuards(JwtAuthGuard)
    @Put(":eventId")
    async updateEvent(
        @Param("eventId") eventId: string,
        @Body() dto: CreateEventDto
    ) {
        return this.eventService.updateEvent(eventId, dto);
    }
}
