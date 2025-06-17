import { Controller, Post, Body, Get, Query, UseGuards, Delete, Param, Put } from "@nestjs/common";
import { EventService } from "./event.service";
import { CreateEventDto } from "./dto/event.dto";
import { EventRegsService } from "src/eventRegs/eventRegs.service";
import { EventRegsModel } from "src/eventRegs/eventRegs.model";
import { JwtAuthGuard } from "src/jwt/jwt-auth.guard";
import { OptionalAuthGuard } from "src/guards/optionalAuth.guard";
import { GetOptionalAuthContext } from "src/decorators/optional-auth-context.decorator";
import { OptionalAuthContext } from "src/interfaces/optional-auth.interface";
import { OptionalAuth } from "src/decorators/optionalAuth.decorator";
import { Auth } from "src/decorators/auth.decorator";
import { InjectModel } from "@m8a/nestjs-typegoose";
import { ModelType } from "@typegoose/typegoose/lib/types";

@Controller("event")
export class EventController {
    constructor(
        private readonly eventService: EventService,
        private readonly eventRegsService: EventRegsService,

        @InjectModel(EventRegsModel)
        private readonly eventRegsModel: ModelType<EventRegsModel>
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
        // Если пользователь не авторизован, возвращаем события без проверки посещаемости
        if (!authContext.isAuthenticated) {
            return this.eventService.getUpcomingEvents(globalGraphId);
        }

        // Оптимизированный подход для авторизованных пользователей
        const [events, userEventRegs] = await Promise.all([
            // Получаем все события
            this.eventService.getUpcomingEvents(globalGraphId),
            
            // Получаем все записи пользователя на события одним запросом
            this.eventRegsModel
                .find({ userId: authContext.userId })
                .select('eventId')
                .lean()
                .exec()
        ]);

        // Создаем Set для быстрого поиска записей на события
        const attendedEventIds = new Set(
            userEventRegs.map(reg => reg.eventId.toString())
        );

        // Добавляем поле isAttended к каждому событию
        const eventsWithAttendance = events.map(event => ({
            ...event,
            isAttended: attendedEventIds.has(event._id.toString())
        }));

        return eventsWithAttendance;
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
