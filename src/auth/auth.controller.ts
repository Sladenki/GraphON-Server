import {
  Controller,
  Get,
  Req,
  Res,
  Post,
  Query,
} from '@nestjs/common';
import { InjectModel } from '@m8a/nestjs-typegoose';
import { UserModel } from 'src/user/user.model';
import { ModelType } from '@typegoose/typegoose/lib/types';
import { Request, Response } from 'express';
import { JwtAuthService } from '../jwt/jwt.service';

@Controller('auth')
export class AuthController {
  constructor(
    private jwtAuthService: JwtAuthService,
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

    const user = await this.findOrCreateUser(userData);
    const accessToken = this.jwtAuthService.generateToken(user._id, user.role);

    console.log('accessToken', accessToken)

    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Redirecting...</title>
          <script>
              function checkAppAndRedirect() {
                  var appLink = "graphon://auth?callback_url=" + encodeURIComponent("${process.env.CLIENT_URL}/profile?accessToken=${accessToken}");
                  var fallbackUrl = "${process.env.CLIENT_URL}/profile?accessToken=${accessToken}";
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
    // const callbackUrl = `${process.env.CLIENT_URL}/profile?accessToken=${accessToken}`;
    // const deepLink = `graphon://auth?callback_url=${encodeURIComponent(callbackUrl)}`;
    // return res.redirect(deepLink);
  }



  // Поиск или создание пользователя в БД
  private async findOrCreateUser(user: any): Promise<any> {
    return this.UserModel.findOneAndUpdate(
      { telegramId: user.telegramId },
      user,
      { 
        upsert: true,
        new: true,
        lean: true
      }
    );
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

}

