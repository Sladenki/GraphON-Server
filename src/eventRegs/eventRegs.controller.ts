import { Controller, Get, HttpCode, Param, Patch, Query, UseGuards, UsePipes, ValidationPipe, HttpException } from "@nestjs/common";
import { Types } from "mongoose";
import { Auth } from "src/decorators/auth.decorator";
import { CurrentUser } from "src/decorators/currentUser.decorator";
import { EventRegsService } from "./eventRegs.service";


@Controller('eventRegs') 
export class EventRegsController {
    constructor(private readonly eventRegsService: EventRegsService) {}

    // Запись (отписка) на мероприятие
    @UsePipes(new ValidationPipe())
    @HttpCode(200)
    @Patch(':eventId')
    @Auth() 
    async toggleEvent(
        @CurrentUser('_id') currentUserId: Types.ObjectId,
        @Param('eventId') eventId: Types.ObjectId,
    ) {
        return this.eventRegsService.toggleEvent(currentUserId, eventId)
    }

    // Получаем мероприятия, на которые подписан пользователь (только предстоящие)
    // Можно указать период в днях через query параметр daysAhead (по умолчанию 30 дней)
    @Get('getEventsByUserId')
    @Auth()
    async getEventsByUserId(
        @CurrentUser('_id') userId: Types.ObjectId,
        @Query('daysAhead') daysAhead?: string,
    ) {
        const days = daysAhead ? parseInt(daysAhead, 10) : 30;
        return this.eventRegsService.getEventsByUserId(userId, days)
    }

    // Получаем ВСЕ мероприятия, на которые был записан пользователь (включая прошедшие)
    @Get('getAllUserEvents')
    @Auth()
    async getAllUserEvents(
        @CurrentUser('_id') userId: Types.ObjectId,
    ) {
        return this.eventRegsService.getAllUserEvents(userId)
    }

    // Получаем всех пользователей, записанных на мероприятие 
    // (для владельца графа или пользователей с ролью 'create')
    @Get('getUsersByEventId/:eventId')
    @Auth()
    async getUsersByEventId(
        @CurrentUser('_id') currentUserId: Types.ObjectId,
        @Param('eventId') eventId: Types.ObjectId,
    ) {
        try {
            return await this.eventRegsService.getUsersByEventId(eventId, currentUserId);
        } catch (error) {
            throw new HttpException(
                error.message || 'Ошибка при получении списка участников',
                error.message === 'Недостаточно прав для просмотра списка участников' ? 403 : 404
            );
        }
    }

    // Проверяем, участвует ли пользователь в мероприятии
    // @Get('isAttending/:eventId')
    // @Auth()
    // async isUserAttendingEvent(
    //     @CurrentUser('_id') userId: Types.ObjectId,
    //     @Param('eventId') eventId: Types.ObjectId,
    // ) {
    //     return this.eventRegsService.isUserAttendingEvent(userId, eventId)
    // }
}