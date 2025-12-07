import { Injectable } from "@nestjs/common";
import { Model } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";
import { UserModel, UserDocument } from "src/user/user.model";
import { Types } from "mongoose";
import { EventModel, EventDocument } from "src/event/event.model";
import { EventRegsModel, EventRegsDocument } from "./eventRegs.model";
import { GraphModel, GraphDocument } from "src/graph/graph.model";

@Injectable()
export class EventRegsService {
    constructor(
        @InjectModel(UserModel.name)
        private readonly userModel: Model<UserDocument>,

        @InjectModel(EventModel.name)
        private readonly eventModel: Model<EventDocument>,

        @InjectModel(EventRegsModel.name)
        private readonly eventRegsModel: Model<EventRegsDocument>,

        @InjectModel(GraphModel.name)
        private readonly graphModel: Model<GraphDocument>,
    ) {}

    // Подписываемся на мероприятие
    async toggleEvent(userId: string | Types.ObjectId, eventId: string | Types.ObjectId) { 
        // Оптимизированный подход: пытаемся удалить запись, если она есть
        const deletedEvent = await (this.eventRegsModel.findOneAndDelete as any)({ userId, eventId }).lean();
    
        if (deletedEvent) {
            // Если запись была найдена и удалена, уменьшаем счётчики
            await Promise.all([
                this.userModel.findOneAndUpdate({ _id: userId }, { $inc: { attentedEventsNum: -1 } }),
                this.eventModel.findOneAndUpdate({ _id: eventId }, { $inc: { regedUsers: -1 } })
            ]);
        } else {
            // Если записи не было, создаём её и увеличиваем счётчики
            await Promise.all([
                this.userModel.findOneAndUpdate({ _id: userId }, { $inc: { attentedEventsNum: 1 } }),
                this.eventModel.findOneAndUpdate({ _id: eventId }, { $inc: { regedUsers: 1 } }),
                this.eventRegsModel.create({ userId, eventId })
            ]);
        }
    }

    // Проверяем, участвует ли пользователь в мероприятии
    async isUserAttendingEvent(userId: string | Types.ObjectId, eventId: string | Types.ObjectId) {
        const eventReg = await (this.eventRegsModel.findOne as any)({ userId, eventId }).exec();
        return !!eventReg;
    }

    // Получаем мероприятия, на которые подписан пользователь (за месяц)
    async getEventsByUserId(userId: string | Types.ObjectId, daysAhead: number = 30) {
        // Получаем начало текущего дня (00:00:00)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Получаем конец периода (по умолчанию 30 дней)
        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() + daysAhead);

        const regs = await (this.eventRegsModel.find as any)({ userId })
            .populate({
                path: 'eventId',
                model: 'EventModel',
                populate: {
                    path: 'graphId',
                    select: 'name imgPath'
                }
            })
            .lean(); 

        // Фильтруем по дате события (от сегодня до endDate)
        const upcomingEvents = regs
            .filter(reg => {
                if (!reg.eventId) return false;
                const eventDate = new Date(reg.eventId.eventDate);
                return eventDate >= today && eventDate < endDate;
            })
            .map(reg => ({
                ...reg,
                isAttended: true
            }));

        return upcomingEvents;
    }

    // Получаем ВСЕ мероприятия, на которые был записан пользователь (включая прошедшие)
    async getAllUserEvents(userId: string | Types.ObjectId) {
        const regs = await (this.eventRegsModel.find as any)({ userId })
            .populate({
                path: 'eventId',
                model: 'EventModel',
                populate: {
                    path: 'graphId',
                    select: 'name imgPath'
                }
            })
            .sort({ createdAt: -1 }) // Сортируем по дате записи (новые сначала)
            .lean(); 

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
        const requestingUser = await this.userModel
            .findById(requestingUserId)
            .select('role')
            .lean();

        if (!requestingUser) {
            throw new Error('Пользователь не найден');
        }

        // Если у пользователя роль 'create', разрешаем доступ без дополнительных проверок
        if (requestingUser.role === 'create' || requestingUser.role === 'admin') {
            const registrations = await (this.eventRegsModel.find as any)({ eventId })
                .sort({ _id: -1 })
                .populate({
                    path: 'userId',
                    select: 'firstName lastName username avaPath telegramId'
                })
                .lean();

            return registrations.map(reg => reg.userId);
        }

        // Для остальных пользователей проверяем права доступа через владение графом
        const event = await this.eventModel
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
        const registrations = await (this.eventRegsModel.find as any)({ eventId })
            .sort({ _id: -1 })
            .populate({
                path: 'userId',
                select: 'firstName lastName username avaPath telegramId'
            })
            .lean();

        return registrations.map(reg => reg.userId);
    }
}