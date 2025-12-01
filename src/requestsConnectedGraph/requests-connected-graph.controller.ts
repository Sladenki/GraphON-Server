import { Controller, Post, Get, Body, UseGuards, HttpCode } from '@nestjs/common';
import { RequestsConnectedGraphService } from './requests-connected-graph.service';
import { Auth } from 'src/decorators/auth.decorator';
import { CurrentUser } from 'src/decorators/currentUser.decorator';
import { Types } from 'mongoose';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';

@Controller('requests-connected-graph')
export class RequestsConnectedGraphController {
    constructor(
        private readonly requestsConnectedGraphService: RequestsConnectedGraphService
    ) {}

    // --- Создание запроса на подключение вуза ---
    @UseGuards(JwtAuthGuard)
    @Post('create')
    @Auth()
    @HttpCode(201)
    async createRequest(
        @CurrentUser('_id') userId: Types.ObjectId,
        @Body('university') university: string
    ) {
        return this.requestsConnectedGraphService.createRequest(userId, university);
    }

    // --- Получение всех запросов (для админов) ---
    @UseGuards(JwtAuthGuard)
    @Get('all')
    @Auth()
    async getAllRequests() {
        return this.requestsConnectedGraphService.getAllRequests();
    }
}

