import { Controller, Get, HttpCode, Param, Patch, UseGuards, UsePipes, ValidationPipe } from "@nestjs/common";
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

    // Получаем мероприятия, на которые подписан пользователь
    @Get('getEventsByUserId')
    @Auth()
    async getEventsByUserId(
        @CurrentUser('_id') userId: Types.ObjectId,
    ) {
        return this.eventRegsService.getEventsByUserId(userId)
    }
}