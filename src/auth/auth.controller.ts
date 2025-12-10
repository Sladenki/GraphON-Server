import {
  Controller,
  Get,
  Req,
  Res,
  Post,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserModel, UserDocument } from 'src/user/user.model';
import { Request, Response } from 'express';
import { JwtAuthService } from '../jwt/jwt.service';
import { TelegramValidatorService } from './telegram-validator.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Controller('auth')
export class AuthController {
  // Хранилище одноразовых кодов (в продакшене использовать Redis)
  private authCodes = new Map<string, { token: string; expiresAt: number }>();

  constructor(
    private jwtAuthService: JwtAuthService,
    @InjectModel(UserModel.name) private readonly userModel: Model<UserDocument>,
    private readonly telegramValidator: TelegramValidatorService,
    private readonly configService: ConfigService,
  ) {
    // Очистка истекших кодов каждые 5 минут
    setInterval(() => {
      const now = Date.now();
      for (const [code, data] of this.authCodes.entries()) {
        if (data.expiresAt < now) {
          this.authCodes.delete(code);
        }
      }
    }, 5 * 60 * 1000);
  }

  // Инициализация при старте модуля
  onModuleInit() {
    // Инициализация модуля
  }
  
  // Эндпоинт для получения данных пользователя после авторизации через Telegram
  @Get('telegram/callback')
  async telegramAuthRedirect(@Req() req: Request, @Res() res: Response, @Query() query: any) {
    console.log('[AuthController] Telegram callback received');
    
    // ВАЛИДАЦИЯ: Проверяем подлинность данных от Telegram
    if (!this.telegramValidator.validateTelegramData(query)) {
      console.log('[AuthController] Validation failed');
      throw new BadRequestException('Invalid Telegram data or data expired');
    }

    console.log('[AuthController] Validation passed, processing user data');
    const { id, first_name, last_name, username, photo_url } = query;

    const userData = {
      telegramId: id,
      firstName: first_name,
      lastName: last_name,
      username: username,
      avaPath: photo_url,
    };

    const user = await this.findOrCreateUser(userData);
    console.log('[AuthController] User found/created:', user._id);
    
    const accessToken = this.jwtAuthService.generateToken(user._id, user.role);

    // БЕЗОПАСНОСТЬ: Используем одноразовый код вместо передачи токена в URL
    const authCode = crypto.randomBytes(32).toString('hex');
    this.authCodes.set(authCode, {
      token: accessToken,
      expiresAt: Date.now() + 5 * 60 * 1000, // Код действителен 5 минут
    });
    
    console.log('[AuthController] Auth code generated:', authCode.substring(0, 8) + '...');
    console.log('[AuthController] Total active codes:', this.authCodes.size);

    const clientUrl = this.configService.get<string>('CLIENT_URL') || 'http://localhost:3000';
    console.log('[AuthController] Redirecting to:', `${clientUrl}/profile?code=${authCode}`);

    // Сохраняем токен в HTTP-only cookie для дополнительной безопасности
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS только в продакшене
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
    });

    // Редирект с одноразовым кодом вместо токена
    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Redirecting...</title>
          <script>
              function checkAppAndRedirect() {
                  var appLink = "graphon://auth?callback_url=" + encodeURIComponent("${clientUrl}/profile?code=${authCode}");
                  var fallbackUrl = "${clientUrl}/profile?code=${authCode}";
                  var start = Date.now();
                  var timeout = setTimeout(function() {
                      if (Date.now() - start < 2000) {
                          window.location.href = fallbackUrl;
                      }
                  }, 1500);
                  window.location.href = appLink;
              }

              window.onload = checkAppAndRedirect;
          </script>
      </head>
      <body>
          <h1>Redirecting...</h1>
      </body>
      </html>
      `);
  }

  // Эндпоинт для обмена одноразового кода на токен
  @Post('exchange-code')
  async exchangeCode(@Req() req: Request, @Res() res: Response) {
    console.log('[AuthController] Exchange code request received');
    console.log('[AuthController] Request body:', req.body);
    
    const { code } = req.body;

    if (!code) {
      console.log('[AuthController] Code is missing');
      throw new BadRequestException('Code is required');
    }

    console.log('[AuthController] Looking for code:', code.substring(0, 8) + '...');
    console.log('[AuthController] Available codes:', this.authCodes.size);
    
    const authData = this.authCodes.get(code);
    if (!authData) {
      console.log('[AuthController] Code not found or expired');
      throw new BadRequestException('Invalid or expired code');
    }

    // Проверяем срок действия
    if (authData.expiresAt < Date.now()) {
      console.log('[AuthController] Code expired');
      this.authCodes.delete(code);
      throw new BadRequestException('Code expired');
    }

    console.log('[AuthController] Code valid, returning token');
    
    // Удаляем использованный код (одноразовый)
    this.authCodes.delete(code);

    // Возвращаем токен
    return res.json({
      accessToken: authData.token,
    });
  }

  // Эндпоинт для проверки статуса кода (только для отладки)
  @Get('check-code')
  async checkCode(@Query('code') code: string) {
    if (!code) {
      return { valid: false, message: 'Code is required' };
    }

    const authData = this.authCodes.get(code);
    if (!authData) {
      return { valid: false, message: 'Code not found' };
    }

    if (authData.expiresAt < Date.now()) {
      return { valid: false, message: 'Code expired', expiresAt: new Date(authData.expiresAt).toISOString() };
    }

    return { 
      valid: true, 
      expiresAt: new Date(authData.expiresAt).toISOString(),
      expiresIn: Math.floor((authData.expiresAt - Date.now()) / 1000) + ' seconds'
    };
  }

  // Поиск или создание пользователя в БД
  private async findOrCreateUser(user: any): Promise<any> {
    // Сначала ищем пользователя
    const existingUser = await this.userModel.findOne({ telegramId: user.telegramId }).lean();
    
    if (existingUser) {
      // Пользователь существует - обновляем данные
      const updateFields: any = {
        avaPath: user.avaPath, // Всегда обновляем аватар
      };
      
      // Обновляем firstName, lastName, username только если они пустые
      if (!existingUser.firstName && user.firstName) {
        updateFields.firstName = user.firstName;
      }
      if (!existingUser.lastName && user.lastName) {
        updateFields.lastName = user.lastName;
      }
      if (!existingUser.username && user.username) {
        updateFields.username = user.username;
      }
      
      const result = await this.userModel.findByIdAndUpdate(
        existingUser._id,
        { $set: updateFields },
        { new: true, lean: true }
      );
      
      return result;
    } else {
      // Создаем нового пользователя
      const result = await this.userModel.create({
        telegramId: user.telegramId,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        avaPath: user.avaPath,
      });
      
      return result;
    }
  }

  // Серверный метод для выхода
  @Post('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    try {
      // Удаляем токен из кук или сессии
      res.clearCookie('accessToken');
      
      // Отправляем успешный ответ
      res.status(200).json({ message: 'Вы успешно вышли из системы' });
    } catch (error) {
      res.status(500).json({ message: 'Ошибка при выходе из системы' });
    }
  }

  // DEV-РЕЖИМ: Эндпоинт для локальной разработки (только в development)
  // Позволяет получить токен для существующего пользователя без Telegram
  @Get('dev/login')
  async devLogin(@Query('telegramId') telegramId: string, @Res() res: Response) {
    // Разрешаем только в development режиме
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException('This endpoint is not available in production');
    }

    if (!telegramId) {
      return res.status(400).json({ 
        error: 'telegramId is required',
        usage: 'GET /api/auth/dev/login?telegramId=YOUR_TELEGRAM_ID'
      });
    }

    // Ищем пользователя по telegramId
    const user = await this.userModel.findOne({ telegramId }).lean();
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        message: `User with telegramId ${telegramId} does not exist. Please authorize through Telegram first.`
      });
    }

    // Генерируем токен
    const accessToken = this.jwtAuthService.generateToken(user._id, user.role);

    // Устанавливаем cookie
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: false, // В dev режиме не требует HTTPS
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      message: 'Dev login successful',
      user: {
        id: user._id,
        telegramId: user.telegramId,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        role: user.role,
      },
      accessToken,
      instructions: {
        header: 'Use this token in Authorization header:',
        value: `Bearer ${accessToken}`,
        cookie: 'Token also saved in HTTP-only cookie',
      }
    });
  }

  // DEV-РЕЖИМ: Список всех пользователей для выбора (только в development)
  @Get('dev/users')
  async devUsersList(@Res() res: Response) {
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException('This endpoint is not available in production');
    }

    const users = await this.userModel.find({})
      .select('telegramId firstName lastName username role')
      .lean();

    return res.json({
      users: users.map(u => ({
        telegramId: u.telegramId,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'No name',
        username: u.username || 'No username',
        role: u.role || 'user',
        loginUrl: `/api/auth/dev/login?telegramId=${u.telegramId}`
      })),
      message: 'Use /api/auth/dev/login?telegramId=XXX to get access token'
    });
  }

}

