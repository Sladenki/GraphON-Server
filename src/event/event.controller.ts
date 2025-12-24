import {
    BadRequestException,
    Controller,
    Delete,
    Get,
    NotFoundException,
    Param,
    Post,
    Put,
    Query,
    StreamableFile,
    UseGuards,
    Body,
} from "@nestjs/common";
import { EventService } from "./event.service";
import { CreateEventDto } from "./dto/event.dto";
import { UpdateEventDto } from "./dto/update-event.dto";
import { EventRegsService } from "src/eventRegs/eventRegs.service";
import { EventRegsModel, EventRegsDocument } from "src/eventRegs/eventRegs.model";
import { JwtAuthGuard } from "src/jwt/jwt-auth.guard";
import { OptionalAuthGuard } from "src/guards/optionalAuth.guard";
import { GetOptionalAuthContext } from "src/decorators/optional-auth-context.decorator";
import { OptionalAuthContext } from "src/interfaces/optional-auth.interface";
import { OptionalAuth } from "src/decorators/optionalAuth.decorator";
import { Auth } from "src/decorators/auth.decorator";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Types } from "mongoose";
import { GraphModel, GraphDocument } from "src/graph/graph.model";
import { buildWorkReportDocx } from "./work-report-docx.util";

@Controller("event")
export class EventController {
    constructor(
        private readonly eventService: EventService,
        private readonly eventRegsService: EventRegsService,

        @InjectModel(EventRegsModel.name)
        private readonly eventRegsModel: Model<EventRegsDocument>,

        @InjectModel(GraphModel.name)
        private readonly graphModel: Model<GraphDocument>,
    ) {}

    // --- Скачивание отчёта по проделанной работе (DOCX) ---
    // query: groupId = ID графа (группы)
    // ВАЖНО: этот роут должен быть выше, чем @Get(":eventId"), иначе "report" матчит как eventId
    @Get("report")
    @UseGuards(JwtAuthGuard, OptionalAuthGuard)
    @OptionalAuth()
    async downloadWorkReportDocx(
        @Query("groupId") groupId: string,
    ) {
        if (!groupId || !Types.ObjectId.isValid(groupId)) {
            throw new BadRequestException("Некорректный groupId");
        }

        const graph = await this.graphModel.findById(groupId).select("name").lean();
        if (!graph) {
            throw new NotFoundException("Граф (группа) не найден");
        }

        const events = await this.eventService.getAllEventsByGraphIdForReport(groupId);
        const buffer = await buildWorkReportDocx({
            graphName: (graph as any).name ?? "—",
            events,
        });

        const filename = "Отчет_1_сем_2025.docx";
        const encoded = encodeURIComponent(filename);
        const disposition = `attachment; filename="report.docx"; filename*=UTF-8''${encoded}`;

        return new StreamableFile(buffer, {
            type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            disposition,
            length: buffer.length,
        });
    }

    // --- Получение мероприятия по id ---
    @Get(":eventId")
    @UseGuards(JwtAuthGuard, OptionalAuthGuard)
    @OptionalAuth()
    async getEventById(
        @GetOptionalAuthContext() authContext: OptionalAuthContext,
        @Param("eventId") eventId: string
    ) {
        const event = await this.eventService.getEventById(eventId);

        // Если пользователь не авторизован, возвращаем событие без проверки посещаемости
        if (!authContext.isAuthenticated) {
            return event;
        }

        // Проверяем, записан ли пользователь на это событие
        const isAttended = await this.eventRegsService.isUserAttendingEvent(
            authContext.userId,
            eventId
        );

        return {
            ...event,
            isAttended
        };
    }

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
    @UseGuards(JwtAuthGuard, OptionalAuthGuard)
    @OptionalAuth()
    async getEventsByGraphId(
        @GetOptionalAuthContext() authContext: OptionalAuthContext,
        @Param("graphId") graphId: string
    ) {
        // Если пользователь не авторизован, возвращаем события без проверки посещаемости
        if (!authContext.isAuthenticated) {
            return this.eventService.getEventsByGraphId(graphId);
        }

        // Оптимизированный подход для авторизованных пользователей
        const [events, userEventRegs] = await Promise.all([
            // Получаем все события
            this.eventService.getEventsByGraphId(graphId),
            
            // Получаем все записи пользователя на события одним запросом
            this.eventRegsModel
                .find({ userId: authContext.userId } as any)
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

    // --- Получение прошедших мероприятий для определённого графа ---
    @Get("past/by-graph/:graphId")
    @UseGuards(JwtAuthGuard, OptionalAuthGuard)
    @OptionalAuth()
    async getPastEventsByGraphId(
        @GetOptionalAuthContext() authContext: OptionalAuthContext,
        @Param("graphId") graphId: string
    ) {
        // Если пользователь не авторизован, возвращаем события без проверки посещаемости
        if (!authContext.isAuthenticated) {
            return this.eventService.getPastEventsByGraphId(graphId);
        }

        // Оптимизированный подход для авторизованных пользователей
        const [events, userEventRegs] = await Promise.all([
            // Получаем все прошедшие события
            this.eventService.getPastEventsByGraphId(graphId),
            
            // Получаем все записи пользователя на события одним запросом
            this.eventRegsModel
                .find({ userId: authContext.userId } as any)
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

    // --- Получение мероприятий на ближайшее время ---
    @Get("upcoming/:selectedGraphId")
    @UseGuards(JwtAuthGuard, OptionalAuthGuard)
    @OptionalAuth()
    async getUpcomingEvents(
        @GetOptionalAuthContext() authContext: OptionalAuthContext,
        @Param("selectedGraphId") globalGraphId: string,
        @Query("skip") skip?: string,
        @Query("limit") limit?: string
    ) {
        // Парсим параметры пагинации (если переданы)
        const skipNum: number | undefined = skip && !isNaN(parseInt(skip, 10)) ? parseInt(skip, 10) : undefined;
        const limitNum: number | undefined = limit && !isNaN(parseInt(limit, 10)) ? parseInt(limit, 10) : undefined;

        // Если пользователь не авторизован, возвращаем события без проверки посещаемости
        if (!authContext.isAuthenticated) {
            // @ts-ignore - TypeScript кэширует старую версию метода, но сигнатура правильная
            return this.eventService.getUpcomingEvents(globalGraphId, skipNum, limitNum);
        }

        // Оптимизированный подход для авторизованных пользователей
        const [events, userEventRegs] = await Promise.all([
            // Получаем события с пагинацией
            // @ts-ignore - TypeScript кэширует старую версию метода, но сигнатура правильная
            this.eventService.getUpcomingEvents(globalGraphId, skipNum, limitNum),
            
            // Получаем все записи пользователя на события одним запросом
            this.eventRegsModel
                .find({ userId: authContext.userId } as any)
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

    // --- Получение мероприятий на неделю по вузу ---
    @Get("weekly/:globalGraphId")
    @UseGuards(JwtAuthGuard, OptionalAuthGuard)
    @OptionalAuth()
    async getWeeklyEvents(
        @GetOptionalAuthContext() authContext: OptionalAuthContext,
        @Param("globalGraphId") globalGraphId: string
    ) {
        if (!authContext.isAuthenticated) {
            const events = await this.eventService.getWeeklyEvents(globalGraphId);
            return this.groupEventsByGraph(events);
        }

        const [events, userEventRegs] = await Promise.all([
            this.eventService.getWeeklyEvents(globalGraphId),
            this.eventRegsModel
                .find({ userId: authContext.userId } as any)
                .select('eventId')
                .lean()
                .exec()
        ]);

        const attendedEventIds = new Set(
            userEventRegs.map(reg => reg.eventId.toString())
        );

        const eventsWithAttendance = events.map(event => ({
            ...event,
            isAttended: attendedEventIds.has(event._id.toString())
        }));

        return this.groupEventsByGraph(eventsWithAttendance);
    }

    private groupEventsByGraph(events: any[]) {
        const groups = new Map<string, { graph: any, events: any[] }>();

        for (const event of events) {
            const graph: any = event.graphId;
            const graphKey = graph && typeof graph === 'object' ? (graph._id?.toString?.() ?? String(graph)) : String(graph);

            if (!groups.has(graphKey)) {
                const graphInfo = graph && typeof graph === 'object' ? graph : { _id: graphKey };
                groups.set(graphKey, { graph: graphInfo, events: [] });
            }

            groups.get(graphKey)!.events.push(event);
        }

        return Array.from(groups.values());
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

    // --- Удаление всех мероприятий с типом "city" ---
    @Delete("delete-all/city")
    async deleteAllCityEvents() {
        return this.eventService.deleteAllCityEvents();
    }

    // --- Редактирование мероприятия ---
    @UseGuards(JwtAuthGuard)
    @Put(":eventId")
    async updateEvent(
        @Param("eventId") eventId: string,
        @Body() dto: UpdateEventDto
    ) {
        return this.eventService.updateEvent(eventId, dto);
    }
}
