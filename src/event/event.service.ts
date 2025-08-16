import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
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
        try {
            return await this.EventModel.create({ 
                ...dto,
                eventDate: new Date(dto.eventDate)
            });
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
                eventDate: { $gte: today }
            })
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
                eventDate: { $gte: today }
            })
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
                eventDate: { $gte: today }, 
                globalGraphId: new Types.ObjectId(globalGraphId) 
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
    async updateEvent(eventId: string | Types.ObjectId, dto: CreateEventDto) {
        try {
            const updatedEvent = await this.EventModel
                .findByIdAndUpdate(
                    eventId,
                    { 
                        ...dto,
                        eventDate: new Date(dto.eventDate)
                    },
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
