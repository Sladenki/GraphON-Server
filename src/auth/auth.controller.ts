// auth.controller.ts
import {
  Controller,
  Get,
  UseGuards,
  Req,
  Res,
  UnauthorizedException,
  Post,
  Query,
  OnModuleInit,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt'; // Для генерации JWT
import { InjectModel } from '@m8a/nestjs-typegoose';
import { UserModel } from 'src/user/user.model';
import { ModelType } from '@typegoose/typegoose/lib/types';
import { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private jwtService: JwtService,
    // Обращаемся к БД модели user
    @InjectModel(UserModel) private readonly UserModel: ModelType<UserModel>,    
  ) { }

  // Инициализация при старте модуля
  onModuleInit() {
    console.log('Bot initialized');
  }
  
  // Эндпоинт для получения данных пользователя после авторизации через Telegram
  @Get('telegram/callback')
  async telegramAuthRedirect(@Req() req: Request, @Res() res: Response, @Query() query: any) {
    console.log('called TG')
    const { id, first_name, last_name, username, photo_url } = query;

    console.log('Из query', id, first_name, last_name, username, photo_url)

    const userData = {
      telegramId: id,
      firstName: first_name,
      lastName: last_name,
      username: username,
      photoUrl: photo_url,
    };

    // Поиск или создание пользователя
    const user = await this.findOrCreateUser(userData);
    const userId = user._id.toString();

    // Генерация JWT
    const payload = { sub: userId, role: user.role };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '30d' });

    console.log('accessToken', accessToken)

    // Определение платформы
    const callbackUrl = `${process.env.CLIENT_URL}/profile?accessToken=${accessToken}`;
    const deepLink = `graphon://auth?callback_url=${encodeURIComponent(callbackUrl)}`;
    return res.redirect(deepLink);
  }

  // Поиск или создание пользователя в БД
  private async findOrCreateUser(user: any): Promise<any> {
    const existingUser = await this.UserModel.findOne({ telegramId: user.telegramId }).lean();
    if (existingUser) {
      return existingUser
    }

    const newUser = new this.UserModel({
      telegramId: user.telegramId,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      avaPath: user.photoUrl, // Если есть
    });

    const savedUser = await newUser.save();
    return savedUser;
  }

  // Серверный метод для выхода
  @Post('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    try {
      // Удаляем токен из кук или сессии
      res.clearCookie('accessToken');
      
      // Удаляем информацию о текущем пользователе из сессии
      req.session = null;

      // Отправляем успешный ответ
      res.status(200).json({ message: 'Вы успешно вышли из системы' });
    } catch (error) {
      res.status(500).json({ message: 'Ошибка при выходе из системы' });
    }
  }

}

