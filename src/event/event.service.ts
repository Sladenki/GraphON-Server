import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventModel, EventDocument } from "./event.model";
import { CreateEventDto } from "./dto/event.dto";
import { UpdateEventDto } from "./dto/update-event.dto";
import { Types } from "mongoose";

@Injectable()
export class EventService {
    constructor(
        @InjectModel(EventModel.name) 
        private readonly eventModel: Model<EventDocument>
    ) {}

    // --- Получение мероприятия по id ---
    async getEventById(eventId: string | Types.ObjectId) {
        const event = await this.eventModel
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
        console.log('dto', dto);
        try {
            if (!dto.eventDate && !dto.isDateTbd) {
                throw new HttpException(
                    'Укажите дату события или установите флаг isDateTbd=true',
                    HttpStatus.BAD_REQUEST
                );
            }

            const payload: any = { ...dto };

            // Явно конвертируем строки в ObjectId для полей, которые в схеме объявлены как ObjectId
            if (dto.globalGraphId) {
                if (!Types.ObjectId.isValid(dto.globalGraphId)) {
                    throw new HttpException('Некорректный globalGraphId', HttpStatus.BAD_REQUEST);
                }
                payload.globalGraphId = new Types.ObjectId(dto.globalGraphId);
            }

            if (dto.graphId) {
                if (!Types.ObjectId.isValid(dto.graphId)) {
                    throw new HttpException('Некорректный graphId', HttpStatus.BAD_REQUEST);
                }
                payload.graphId = new Types.ObjectId(dto.graphId);
            }

            if (dto.eventDate) {
                payload.eventDate = new Date(dto.eventDate);
                payload.isDateTbd = false;
            } else if (dto.isDateTbd) {
                payload.isDateTbd = true;
                payload.eventDate = null;
            }

            return await this.eventModel.create(payload);
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
    async getEventsByGraphId(graphId: string | Types.ObjectId) {
        // Преобразуем graphId в ObjectId для корректного поиска в БД
        const graphObjectId = typeof graphId === 'string' ? new Types.ObjectId(graphId) : graphId;
        
        // Получаем текущее время (включая часы и минуты)
        const now = new Date();
        
        const events = await (this.eventModel.find as any)({ graphId: graphObjectId })
            .populate("graphId", "name imgPath")
            .lean();
        
        // Сортируем: сначала будущие мероприятия и с isDateTbd, потом прошедшие
        return events.sort((a, b) => {
            // Сначала мероприятия с isDateTbd
            if (a.isDateTbd && !b.isDateTbd) return -1;
            if (!a.isDateTbd && b.isDateTbd) return 1;
            
            // Если оба с isDateTbd или оба без, сортируем по дате
            if (!a.eventDate && !b.eventDate) return 0;
            if (!a.eventDate) return 1;
            if (!b.eventDate) return -1;
            
            const dateA = new Date(a.eventDate);
            const dateB = new Date(b.eventDate);
            const isAPast = dateA < now;
            const isBPast = dateB < now;
            
            // Будущие мероприятия идут перед прошедшими
            if (!isAPast && isBPast) return -1;
            if (isAPast && !isBPast) return 1;
            
            // Если оба будущие или оба прошедшие, сортируем по дате
            return dateA.getTime() - dateB.getTime();
        });
    }

    // --- Получение ВСЕХ мероприятий для отчёта по графу (без фильтров по времени) ---
    async getAllEventsByGraphIdForReport(graphId: string | Types.ObjectId) {
        const graphObjectId = typeof graphId === 'string' ? new Types.ObjectId(graphId) : graphId;

        const events = await (this.eventModel.find as any)({ graphId: graphObjectId })
            .select('name description eventDate isDateTbd regedUsers')
            .lean();

        // Для отчёта удобнее хронологически (без "дата уточняется" в начале)
        return (events as any[]).sort((a, b) => {
            const aTbd = Boolean(a?.isDateTbd);
            const bTbd = Boolean(b?.isDateTbd);
            if (aTbd !== bTbd) return aTbd ? 1 : -1;

            const aTime = a?.eventDate ? new Date(a.eventDate).getTime() : Number.POSITIVE_INFINITY;
            const bTime = b?.eventDate ? new Date(b.eventDate).getTime() : Number.POSITIVE_INFINITY;
            return aTime - bTime;
        });
    }

    // --- Получение прошедших мероприятий для определённого графа ---
    async getPastEventsByGraphId(graphId: string) {
        // Начало текущего дня (00:00:00)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return (this.eventModel.find as any)({ 
                graphId,
                eventDate: { $lt: today },
                isDateTbd: { $ne: true }
            })
            .sort({ eventDate: -1 })
            .populate("graphId", "name imgPath")
            .lean();
    }

    // Получение мероприятий массива графов
    async getEventsByGraphsIds(graphIds: string[] | Types.ObjectId[]) {
        // Преобразуем все graphIds в ObjectId для корректного поиска в БД
        const graphObjectIds = graphIds.map(id => 
            typeof id === 'string' ? new Types.ObjectId(id) : id
        );
        
        // Получаем текущее время (включая часы и минуты)
        const now = new Date();
        
        return (this.eventModel.find as any)({
                graphId: { $in: graphObjectIds },
                $or: [
                    { eventDate: { $gt: now } }, // Больше текущего времени
                    { isDateTbd: true }
                ]
            })
            .sort({ isDateTbd: 1, eventDate: 1 })
            .populate("graphId", "name imgPath")
            .lean();
    }

    // --- Получение мероприятий на ближайшее время ---
    async getUpcomingEvents(globalGraphId: string, skip?: number, limit?: number) {
        // Получаем начало текущего дня для корректного сравнения
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const query = (this.eventModel.find as any)({ 
                globalGraphId: new Types.ObjectId(globalGraphId),
                $or: [
                    { 
                        eventDate: { 
                            $exists: true,
                            $ne: null,
                            $gte: today 
                        } 
                    }, // Больше или равно началу текущего дня
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
            });
        
        // Применяем пагинацию только если параметры переданы
        if (skip !== undefined && skip !== null) {
            query.skip(skip);
        }
        if (limit !== undefined && limit !== null) {
            query.limit(limit);
        }
        
        return query.lean();
    }

    // --- Получение мероприятий на неделю по вузу ---
    async getWeeklyEvents(globalGraphId: string) {
        const now = new Date(); // Текущее время
        const end = new Date(now);
        end.setDate(end.getDate() + 7);

        return (this.eventModel.find as any)({
                globalGraphId: new Types.ObjectId(globalGraphId),
                eventDate: { $gt: now, $lt: end } // Больше текущего времени, меньше чем через неделю
            })
            .sort({ eventDate: 1 })
            .populate("graphId", "name imgPath ownerUserId")
            .lean();
    }

    // --- Удаление мероприятия ---
    async deleteEvent(eventId: string | Types.ObjectId) {
        return this.eventModel.findByIdAndDelete(eventId).lean();
    }

    // --- Удаление всех мероприятий с типом "city" ---
    async deleteAllCityEvents() {
        const result = await this.eventModel.deleteMany({ type: "city" });
        return {
            deletedCount: result.deletedCount,
            message: `Удалено мероприятий: ${result.deletedCount}`
        };
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

            const updatedEvent = await this.eventModel
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
