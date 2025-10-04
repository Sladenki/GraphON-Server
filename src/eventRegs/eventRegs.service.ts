import { Injectable } from "@nestjs/common";
import { ModelType } from "@typegoose/typegoose/lib/types";
import { UserModel } from "src/user/user.model";
import { Types } from "mongoose";
import { EventModel } from "src/event/event.model";
import { InjectModel } from "@m8a/nestjs-typegoose";
import { EventRegsModel } from "./eventRegs.model";
import { GraphModel } from "src/graph/graph.model";

@Injectable()
export class EventRegsService {
    constructor(
        @InjectModel(UserModel)
        private readonly UserModel: ModelType<UserModel>,

        @InjectModel(EventModel)
        private readonly EventModel: ModelType<EventModel>,

        @InjectModel(EventRegsModel)
        private readonly EventRegsModel: ModelType<EventRegsModel>,

        @InjectModel(GraphModel)
        private readonly GraphModel: ModelType<GraphModel>,
    ) {}

    // Подписываемся на мероприятие
    async toggleEvent(userId: string | Types.ObjectId, eventId: string | Types.ObjectId) { 
        // Оптимизированный подход: пытаемся удалить запись, если она есть
        const deletedEvent = await this.EventRegsModel.findOneAndDelete({ userId, eventId }).lean();
    
        if (deletedEvent) {
            // Если запись была найдена и удалена, уменьшаем счётчики
            await Promise.all([
                this.UserModel.findOneAndUpdate({ _id: userId }, { $inc: { attentedEventsNum: -1 } }),
                this.EventModel.findOneAndUpdate({ _id: eventId }, { $inc: { regedUsers: -1 } })
            ]);
        } else {
            // Если записи не было, создаём её и увеличиваем счётчики
            await Promise.all([
                this.UserModel.findOneAndUpdate({ _id: userId }, { $inc: { attentedEventsNum: 1 } }),
                this.EventModel.findOneAndUpdate({ _id: eventId }, { $inc: { regedUsers: 1 } }),
                this.EventRegsModel.create({ userId, eventId })
            ]);
        }
    }

    // Проверяем, участвует ли пользователь в мероприятии
    async isUserAttendingEvent(userId: string | Types.ObjectId, eventId: string | Types.ObjectId) {
        const eventReg = await this.EventRegsModel.findOne({ userId, eventId }).exec();
        return !!eventReg;
    }

    // Получаем мероприятия, на которые подписан пользователь (для профиля)
    async getEventsByUserId(userId: string | Types.ObjectId) {
        // Получаем начало текущего дня (00:00:00)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const regs = await this.EventRegsModel
            .find({ userId })
            .populate({
                path: 'eventId',
                model: 'EventModel',
                populate: {
                    path: 'graphId',
                    select: 'name imgPath'
                }
            })
            .lean<{ eventId: EventModel }[]>(); 

        // Фильтруем по дате события
        const upcomingEvents = regs
            .filter(reg => reg.eventId && new Date(reg.eventId.eventDate) >= today)
            .map(reg => ({
                ...reg,
                isAttended: true
            }));

        return upcomingEvents;
    }

    // Получаем ВСЕ мероприятия, на которые был записан пользователь (включая прошедшие)
    async getAllUserEvents(userId: string | Types.ObjectId) {
        const regs = await this.EventRegsModel
            .find({ userId })
            .populate({
                path: 'eventId',
                model: 'EventModel',
                populate: {
                    path: 'graphId',
                    select: 'name imgPath'
                }
            })
            .sort({ createdAt: -1 }) // Сортируем по дате записи (новые сначала)
            .lean<{ eventId: EventModel }[]>(); 

        // Возвращаем все мероприятия с информацией о том, что пользователь был записан
        const allEvents = regs
            .filter(reg => reg.eventId) // Фильтруем только валидные события
            .map(reg => ({
                ...reg.eventId,
                isAttended: true
            }));

        return allEvents;
    }

    // Получаем всех пользователей, записанных на мероприятие
    async getUsersByEventId(eventId: string | Types.ObjectId, requestingUserId: string | Types.ObjectId) {
        // Получаем информацию о запрашивающем пользователе
        const requestingUser = await this.UserModel
            .findById(requestingUserId)
            .select('role')
            .lean();

        if (!requestingUser) {
            throw new Error('Пользователь не найден');
        }

        // Если у пользователя роль 'create', разрешаем доступ без дополнительных проверок
        if (requestingUser.role === 'create' || requestingUser.role === 'admin') {
            const registrations = await this.EventRegsModel
                .find({ eventId })
                .sort({ _id: -1 })
                .populate({
                    path: 'userId',
                    select: 'firstName lastName username avaPath telegramId'
                })
                .lean();

            return registrations.map(reg => reg.userId);
        }

        // Для остальных пользователей проверяем права доступа через владение графом
        const event = await this.EventModel
            .findById(eventId)
            .populate({
                path: 'graphId',
                select: 'ownerUserId'
            })
            .lean();

        if (!event) {
            throw new Error('Мероприятие не найдено');
        }

        // Проверяем права доступа - пользователь должен быть владельцем графа
        if (event.graphId && typeof event.graphId === 'object' && 'ownerUserId' in event.graphId) {
            if (event.graphId.ownerUserId.toString() !== requestingUserId.toString()) {
                throw new Error('Недостаточно прав для просмотра списка участников');
            }
        } else {
            throw new Error('Информация о графе недоступна');
        }

        // Если проверка прошла успешно, получаем список пользователей
        const registrations = await this.EventRegsModel
            .find({ eventId })
            .sort({ _id: -1 })
            .populate({
                path: 'userId',
                select: 'firstName lastName username avaPath telegramId'
            })
            .lean();

        return registrations.map(reg => reg.userId);
    }
}