// auth.controller.ts
import {
  Controller,
  Get,
  UseGuards,
  Req,
  Res,
  UnauthorizedException,
  Post,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt'; // Для генерации JWT
import { InjectModel } from '@m8a/nestjs-typegoose';
import { UserModel } from 'src/user/user.model';
import { ModelType } from '@typegoose/typegoose/lib/types';
import { v4 as uuidv4 } from 'uuid'; // Импортируем uuid
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {

  private supportsCapacitor: boolean;

  constructor(
    private jwtService: JwtService,

    // Обращаемся к БД модели user
    @InjectModel(UserModel) private readonly UserModel: ModelType<UserModel>,

    private readonly configService: ConfigService,
  ) {
    const supportsCapacitorString = this.configService.get<string>('SUPPORTS_CAPACITOR');
    this.supportsCapacitor = supportsCapacitorString === 'true'; // Сравниваем со строкой "true"
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // console.log('Маршрут /auth/google вызван');
  }
  

  @Get('callback/google')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res) {
    const user = req.user;

    const isCapacitor = this.supportsCapacitor

    console.log('isCapacitor ?', isCapacitor)

    try {
      const userId = await this.findOrCreateUser(user);

      // const payload = { sub: userId, email: user.email };
      const payload = { sub: userId };
      const accessToken = this.jwtService.sign(payload, { expiresIn: '30d' }); // Короткий срок действия (например, 15 минут)
      const refreshToken = uuidv4(); // Генерируем уникальный refresh token

      // Сохраняем refresh token в базе данных, связав его с пользователем
      await this.UserModel.findByIdAndUpdate(userId, { refreshToken });

      if (isCapacitor) {
        // const appScheme = 'com.mycompany.myapp://profile';
        const appScheme = 'com.mycompany.myapp://auth/callback';
        const redirectUrl = `${appScheme}?accessToken=${accessToken}`;
        return res.redirect(redirectUrl);
      } else {
        // Редирект для веб-приложения
        res.redirect(`${process.env.CLIENT_URL}/profile?accessToken=${accessToken}`);
      }

    } catch (error) {
      console.error('Ошибка при поиске/создании пользователя:', error);
      res.redirect(
        `${process.env.CLIENT_URL}/error?message=Ошибка авторизации`,
      );
    }
  }

  private async findOrCreateUser(user: any): Promise<string> {
    console.log('user', user)
    const existingUser = await this.UserModel.findOne({ email: user.email }).lean();
    if (existingUser) {
        return existingUser._id.toString();
    }
    const newUser = new this.UserModel({
      email: user.email,
      name: user.name,
      avaPath: user.picture, 
    });

    console.log('newUser', newUser)

    const savedUser = await newUser.save();
    return savedUser._id.toString();
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res() res) {
    // console.log('logount hit');
    try {
      const user = req['user']; // Получаем пользователя из запроса (если есть)

      if (user && user.sub) {
        // Проверяем, есть ли пользователь и его ID
        await this.UserModel.findByIdAndUpdate(user.sub, {
          refreshToken: null,
        });
      }

      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        sameSite: 'strict',
      });

      res.status(200).json({ message: 'Выход выполнен успешно' });
    } catch (error) {
      console.error('Ошибка при выходе:', error);
      res.status(500).json({ message: 'Ошибка при выходе из системы' });
    }
  }

  // Эндпоинт для обновления токена
  @Post('refresh')
  async refresh(@Req() req, @Res() res) {
    const refreshToken = req.cookies['refreshToken'];
    if (!refreshToken) {
      throw new UnauthorizedException();
    }

    try {
      const user = await this.UserModel.findOne({ refreshToken });
      if (!user) {
        throw new UnauthorizedException();
      }

      const payload = { sub: user._id.toString(), email: user.email };
      const newAccessToken = this.jwtService.sign(payload, {
        expiresIn: '15m',
      });

      res.json({ accessToken: newAccessToken });
    } catch (error) {
      throw new UnauthorizedException();
    }
  }

}
