import { Injectable } from "@nestjs/common";
import { ModelType } from "@typegoose/typegoose/lib/types";
import { UserModel } from "src/user/user.model";
import { Types } from "mongoose";
import { EventModel } from "src/event/event.model";
import { InjectModel } from "@m8a/nestjs-typegoose";
import { EventRegsModel } from "./eventRegs.model";

@Injectable()
export class EventRegsService {
    constructor(
        @InjectModel(UserModel)
        private readonly UserModel: ModelType<UserModel>,

        @InjectModel(EventModel)
        private readonly EventModel: ModelType<EventModel>,

        @InjectModel(EventRegsModel)
        private readonly EventRegsModel: ModelType<EventRegsModel>,
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
}