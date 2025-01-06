import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Request,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import { AuthUserDto } from './dto/auth-user.dto';
import { Types } from 'mongoose';
// import { CacheInterceptor } from '@nestjs/cache-manager';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './jwt-auth.guard';
import { InjectModel } from '@m8a/nestjs-typegoose';
import { UserModel } from './user.model';
import { ModelType } from '@typegoose/typegoose/lib/types';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,

    // Обращаемся к БД модели user
    @InjectModel(UserModel) private readonly UserModel: ModelType<UserModel>,
  ) {}

  // @Get(':id') // Эндпоинт для получения данных пользователя по ID
  // async getUserById(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: Request) {

  //   const user = req['user'];
  //   if(user.sub !== id) {
  //     throw new UnauthorizedException()
  //   }

  //   try {
  //       const user = await this.UserModel.findById(id);
  //       if (!user) {
  //           throw new NotFoundException('Пользователь не найден');
  //       }
  //       return user; // Возвращаем полную информацию о пользователе
  //   } catch (error) {
  //       console.error(error)
  //       throw new InternalServerErrorException('Ошибка сервера');
  //   }
  // }

  // Авторизация \ регистрация
  @Post('auth')
  auth(@Body() dto: AuthUserDto) {
    return this.userService.auth(dto);
  }

  // Получение данных пользователя по его ID
  @Get('getById/:id')
  // @UseInterceptors(CacheInterceptor) // Для Redis
  async getUser(@Param('id') id: string) {
    return this.userService.getUserById(new Types.ObjectId(id));
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req) {
    return req.user;
  }
}
