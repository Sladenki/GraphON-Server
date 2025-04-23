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
    
        // Проверяем, существует ли уже объект 
        const isAttendedEvent = await this.EventRegsModel.findOne({ userId, eventId }).exec();
    
        if (isAttendedEvent) {
            // Если существует, то удаляем его и обновляем счётчики
            await Promise.all([
                this.UserModel.findOneAndUpdate({ _id: userId }, { $inc: { attentedEventsNum: -1 } }).exec(),
                this.EventModel.findOneAndUpdate({ _id: eventId }, { $inc: { regedUsers: -1 } }).exec(),
                this.EventRegsModel.deleteOne({ userId, eventId })
            ]);
        } else {
            // Создаём новый объект, если его ещё нет, и обновляем счётчики
            await Promise.all([
                this.UserModel.findOneAndUpdate({ _id: userId }, { $inc: { attentedEventsNum: 1 } }).exec(),
                this.EventModel.findOneAndUpdate({ _id: eventId }, { $inc: { regedUsers: 1 } }).exec(),
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
        const events = await this.EventRegsModel
            .find({ userId })
            .populate('eventId')
            .lean();

        // Добавляем поле isAttended для каждого мероприятия
        return events.map(event => ({
            ...event,
            isAttended: true
        }));
    }
}