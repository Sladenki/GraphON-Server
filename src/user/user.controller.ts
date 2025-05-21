import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Request,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import { AuthUserDto } from './dto/auth-user.dto';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { InjectModel } from '@m8a/nestjs-typegoose';
import { UserModel } from './user.model';
import { ModelType } from '@typegoose/typegoose/lib/types';
import { USER_CONSTANTS } from '../constants/user.constants';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
  ) {}

  // Авторизация \ регистрация
  @Post('auth')
  auth(
    @Body() dto: AuthUserDto
  ) {
    return this.userService.auth(dto);
  }

  // Получение данных пользователя по его ID
  @Get('getById/:id')
  async getUser(
    @Param('id') id: string
  ) {
    return this.userService.getUserById(new Types.ObjectId(id));
  }

  // Получение всех пользователей
  @Get('allUsers')
  async getAllUsers(
    @Query('lastId') lastId?: string,
    @Query('limit') limit?: string
  ) {
    const parsedLimit = parseInt(limit, 10);
    const size = isNaN(parsedLimit) ? USER_CONSTANTS.DEFAULT_USERS_LIMIT : parsedLimit;
    
    return this.userService.getAllUsers(lastId, size);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req) {
    return req.user;
  }
}
