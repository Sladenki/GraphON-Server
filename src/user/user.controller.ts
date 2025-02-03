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
