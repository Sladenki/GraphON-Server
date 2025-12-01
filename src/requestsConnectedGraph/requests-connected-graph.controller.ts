import { Controller, Post, Get, Body, UseGuards, HttpCode, Req } from '@nestjs/common';
import { RequestsConnectedGraphService } from './requests-connected-graph.service';
import { Auth } from 'src/decorators/auth.decorator';
import { CurrentUser } from 'src/decorators/currentUser.decorator';
import { Types } from 'mongoose';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';
import { OptionalAuthGuard } from 'src/guards/optionalAuth.guard';
import { GetOptionalAuthContext } from 'src/decorators/optional-auth-context.decorator';
import { OptionalAuthContext } from 'src/interfaces/optional-auth.interface';
import { OptionalAuth } from 'src/decorators/optionalAuth.decorator';

@Controller('requests-connected-graph')
export class RequestsConnectedGraphController {
    constructor(
        private readonly requestsConnectedGraphService: RequestsConnectedGraphService
    ) {}

    // --- Создание запроса на подключение вуза ---
    @UseGuards(JwtAuthGuard, OptionalAuthGuard)
    @Post('create')
    @OptionalAuth()
    @HttpCode(201)
    async createRequest(
        @GetOptionalAuthContext() authContext: OptionalAuthContext,
        @Body('university') university: string
    ) {
        // Если пользователь авторизован, передаем его ID, иначе undefined
        const userId = authContext.isAuthenticated 
            ? authContext.userId 
            : undefined;
        
        return this.requestsConnectedGraphService.createRequest(university, userId);
    }

    // --- Получение всех запросов (для админов) ---
    @UseGuards(JwtAuthGuard)
    @Get('all')
    @Auth()
    async getAllRequests() {
        return this.requestsConnectedGraphService.getAllRequests();
    }
}

