import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, UseGuards, UsePipes, ValidationPipe } from "@nestjs/common";

import { Types } from "mongoose";
import { Auth } from "src/decorators/auth.decorator";
import { CurrentUser } from "src/decorators/currentUser.decorator";
import { GraphSubsService } from "./graphSubs.service";


@Controller('graphSubs') 
export class GraphSubsController {
    constructor(private readonly graphSubsService: GraphSubsService) {}

    // --- Подписка (отписка) на граф ---
    @UsePipes(new ValidationPipe())
    @HttpCode(200)
    @Post()
    @Auth() 
    async toggleSub(
        @CurrentUser('_id') currentUserId: Types.ObjectId,
        @Body() body: { graphId: string },
    ) {
        const { graphId } = body;

        // Преобразуем graphId в ObjectId
        const graphIdObjectId = new Types.ObjectId(graphId);

        return this.graphSubsService.toggleSub(currentUserId, graphIdObjectId)
    }

    // --- Получение расписания из подписанных графов ---
    // Для страницы расписания
    // Можно указать период в днях через query параметр daysAhead (по умолчанию 30 дней)
    @Get('getSubsSchedule')
    @Auth()
    async getSubsSchedule(
        @CurrentUser('_id') userId: Types.ObjectId,
        @Query('daysAhead') daysAhead?: string,
    ) {
        const days = daysAhead ? parseInt(daysAhead, 10) : 30;
        return this.graphSubsService.getSubsSchedule(userId, days)
    }

    // --- Получение событий из подписок ---
    @Get('getSubsEvents')
    @Auth()
    async getSubsEvents(
        @CurrentUser('_id') userId: Types.ObjectId,
    ) {
        return this.graphSubsService.getSubsEvents(userId)
    }

    // --- Получение всех групп, на которые подписан пользователь ---
    @Get('getUserSubscribedGraphs')
    @Auth()
    async getUserSubscribedGraphs(
        @CurrentUser('_id') userId: Types.ObjectId,
    ) {
        return this.graphSubsService.getUserSubscribedGraphs(userId)
    }

    // --- Получение всех подписчиков графа по его ID ---
    @Get('getGraphSubscribers/:graphId')
    @Auth()
    async getGraphSubscribers(
        @Param('graphId') graphId: string,
    ) {
        return this.graphSubsService.getGraphSubscribers(new Types.ObjectId(graphId))
    }

}