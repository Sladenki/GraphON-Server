import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { InjectModel } from '@m8a/nestjs-typegoose';
import { EventModel } from "./event.model";
import { ModelType } from "@typegoose/typegoose/lib/types";
import { CreateEventDto } from "./dto/event.dto";
import { UpdateEventDto } from "./dto/update-event.dto";
import { Types } from "mongoose";

@Injectable()
export class EventService {
    constructor(
        @InjectModel(EventModel) 
        private readonly EventModel: ModelType<EventModel>
    ) {}

    // --- Получение мероприятия по id ---
    async getEventById(eventId: string | Types.ObjectId) {
        const event = await this.EventModel
            .findById(eventId)
            .populate("graphId", "name imgPath ownerUserId")
            .lean();

        if (!event) {
            throw new HttpException(
                'Мероприятие не найдено',
                HttpStatus.NOT_FOUND
            );
        }

        return event;
    }

    // --- Создание мероприятия ---
    async createEvent(dto: CreateEventDto) {
        try {
            if (!dto.eventDate && !dto.isDateTbd) {
                throw new HttpException(
                    'Укажите дату события или установите флаг isDateTbd=true',
                    HttpStatus.BAD_REQUEST
                );
            }

            const payload: any = { ...dto };
            if (dto.eventDate) {
                payload.eventDate = new Date(dto.eventDate);
                payload.isDateTbd = false;
            } else if (dto.isDateTbd) {
                payload.isDateTbd = true;
                payload.eventDate = null;
            }

            return await this.EventModel.create(payload);
        } catch (error) {
            // Обработка ошибок валидации MongoDB
            if (error.name === 'ValidationError') {
                const errors = Object.values(error.errors).map((err: any) => {
                    if (err.kind === 'maxlength') {
                        return `Поле "${err.path}" не может быть длиннее ${err.properties.maxlength} символов`;
                    }
                    if (err.kind === 'required') {
                        return `Поле "${err.path}" обязательно для заполнения`;
                    }
                    return `Ошибка в поле "${err.path}": ${err.message}`;
                });
                
                throw new HttpException({
                    message: 'Ошибка валидации данных',
                    errors: errors
                }, HttpStatus.BAD_REQUEST);
            }
            
            // Обработка других ошибок
            throw new HttpException(
                'Произошла ошибка при создании мероприятия',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    // --- Получение мероприятий для определённого графа ---
    async getEventsByGraphId(graphId: string) {
        // Получаем начало текущего дня (00:00:00)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        return this.EventModel
            .find({ 
                graphId,
                $or: [
                    { eventDate: { $gte: today } },
                    { isDateTbd: true }
                ]
            })
            .sort({ isDateTbd: 1, eventDate: 1 })
            .populate("graphId", "name imgPath")
            .lean();
    }

    // --- Получение прошедших мероприятий для определённого графа ---
    async getPastEventsByGraphId(graphId: string) {
        // Начало текущего дня (00:00:00)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return this.EventModel
            .find({ 
                graphId,
                eventDate: { $lt: today },
                isDateTbd: { $ne: true }
            })
            .sort({ eventDate: -1 })
            .populate("graphId", "name imgPath")
            .lean();
    }

    // Получение мероприятий массива графов
    async getEventsByGraphsIds(graphIds: string[]) {
        // Получаем начало текущего дня (00:00:00)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        return this.EventModel
            .find({
                graphId: { $in: graphIds },
                $or: [
                    { eventDate: { $gte: today } },
                    { isDateTbd: true }
                ]
            })
            .sort({ isDateTbd: 1, eventDate: 1 })
            .populate("graphId", "name imgPath")
            .lean();
    }

    // --- Получение мероприятий на ближайшее время ---
    async getUpcomingEvents(globalGraphId: string) {
        // Получаем начало текущего дня (00:00:00)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        return this.EventModel
            .find({ 
                globalGraphId: new Types.ObjectId(globalGraphId),
                $or: [
                    { eventDate: { $gte: today } },
                    { isDateTbd: true }
                ]
            })
            .sort({ isDateTbd: 1, eventDate: 1 })
            .populate({
                path: "graphId",
                select: "name imgPath ownerUserId parentGraphId",
                populate: {
                    path: "parentGraphId",
                    select: "name imgPath ownerUserId"
                }
            })
            .lean();
    }

    // --- Получение мероприятий на неделю по вузу ---
    async getWeeklyEvents(globalGraphId: string) {
        const start = new Date();
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setDate(end.getDate() + 7);

        return this.EventModel
            .find({
                globalGraphId: new Types.ObjectId(globalGraphId),
                eventDate: { $gte: start, $lt: end }
            })
            .sort({ eventDate: 1 })
            .populate("graphId", "name imgPath ownerUserId")
            .lean();
    }

    // --- Удаление мероприятия ---
    async deleteEvent(eventId: string | Types.ObjectId) {
        return this.EventModel.findByIdAndDelete(eventId).lean();
    }

    // --- Редактирование мероприятия ---
    async updateEvent(eventId: string | Types.ObjectId, dto: UpdateEventDto) {
        try {
            const update: any = { ...dto };
            if (dto.eventDate) {
                update.eventDate = new Date(dto.eventDate);
                update.isDateTbd = false;
            } else if (dto.isDateTbd === true) {
                update.isDateTbd = true;
                update.eventDate = null;
            }

            const updatedEvent = await this.EventModel
                .findByIdAndUpdate(
                    eventId,
                    update,
                    { new: true, runValidators: true }
                )
                .populate("graphId", "name")
                .lean();

            if (!updatedEvent) {
                throw new HttpException(
                    'Мероприятие не найдено',
                    HttpStatus.NOT_FOUND
                );
            }

            return updatedEvent;
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }

            // Обработка ошибок валидации MongoDB
            if (error.name === 'ValidationError') {
                const errors = Object.values(error.errors).map((err: any) => {
                    if (err.kind === 'maxlength') {
                        return `Поле "${err.path}" не может быть длиннее ${err.properties.maxlength} символов`;
                    }
                    if (err.kind === 'required') {
                        return `Поле "${err.path}" обязательно для заполнения`;
                    }
                    return `Ошибка в поле "${err.path}": ${err.message}`;
                });
                
                throw new HttpException({
                    message: 'Ошибка валидации данных',
                    errors: errors
                }, HttpStatus.BAD_REQUEST);
            }
            
            // Обработка других ошибок
            throw new HttpException(
                'Произошла ошибка при обновлении мероприятия',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
}
