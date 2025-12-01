import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@m8a/nestjs-typegoose';
import { RequestsConnectedGraphModel } from './requests-connected-graph.model';
import { ModelType } from '@typegoose/typegoose/lib/types';
import { Types } from 'mongoose';
import { UserModel } from 'src/user/user.model';

@Injectable()
export class RequestsConnectedGraphService {
    constructor(
        @InjectModel(RequestsConnectedGraphModel)
        private readonly RequestsConnectedGraphModel: ModelType<RequestsConnectedGraphModel>,
        @InjectModel(UserModel)
        private readonly UserModel: ModelType<UserModel>,
    ) {}

    // --- Создание запроса на подключение вуза ---
    async createRequest(userId: Types.ObjectId, university: string) {
        try {
            if (!university || university.trim().length === 0) {
                throw new HttpException(
                    'Название вуза обязательно для заполнения',
                    HttpStatus.BAD_REQUEST
                );
            }

            // Проверяем, существует ли пользователь
            const user = await this.UserModel.findById(userId).lean();
            if (!user) {
                throw new HttpException(
                    'Пользователь не найден',
                    HttpStatus.NOT_FOUND
                );
            }

            // Создаем запрос
            const request = await this.RequestsConnectedGraphModel.create({
                userId,
                university: university.trim(),
            });

            return request;
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException(
                'Ошибка при создании запроса на подключение вуза',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    // --- Получение всех запросов ---
    async getAllRequests() {
        try {
            return await this.RequestsConnectedGraphModel
                .find()
                .populate('userId', 'firstName lastName username telegramId')
                .sort({ createdAt: -1 })
                .lean();
        } catch (error) {
            throw new HttpException(
                'Ошибка при получении запросов',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
}

