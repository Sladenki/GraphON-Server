import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RequestsConnectedGraphModel, RequestsConnectedGraphDocument } from './requests-connected-graph.model';
import { Types } from 'mongoose';
import { UserModel, UserDocument } from 'src/user/user.model';

@Injectable()
export class RequestsConnectedGraphService {
    constructor(
        @InjectModel(RequestsConnectedGraphModel.name)
        private readonly requestsConnectedGraphModel: Model<RequestsConnectedGraphDocument>,
        @InjectModel(UserModel.name)
        private readonly userModel: Model<UserDocument>,
    ) {}

    // --- Создание запроса на подключение вуза ---
    async createRequest(university: string, userId?: Types.ObjectId) {
        try {
            if (!university || university.trim().length === 0) {
                throw new HttpException(
                    'Название вуза обязательно для заполнения',
                    HttpStatus.BAD_REQUEST
                );
            }

            // Если userId передан, проверяем существование пользователя
            if (userId) {
                const user = await this.userModel.findById(userId).lean();
                if (!user) {
                    throw new HttpException(
                        'Пользователь не найден',
                        HttpStatus.NOT_FOUND
                    );
                }
            }

            // Создаем запрос (userId может быть undefined, если пользователь не авторизован)
            const request = await this.requestsConnectedGraphModel.create({
                userId: userId || undefined,
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
            return await this.requestsConnectedGraphModel
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

