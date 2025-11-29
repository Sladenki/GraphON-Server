import {
  Body,
  Controller,
  Delete,
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
  Patch,
} from '@nestjs/common';
import { UserService } from './user.service';
import { AuthUserDto } from './dto/auth-user.dto';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { InjectModel } from '@m8a/nestjs-typegoose';
import { UserModel } from './user.model';
import { ModelType } from '@typegoose/typegoose/lib/types';
import { USER_CONSTANTS } from '../constants/user.constants';
import { Auth } from "src/decorators/auth.decorator";
import { CurrentUser } from 'src/decorators/currentUser.decorator';
import { UpdateUserDto } from './dto/update-user.dto';

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
    // @Query('lastId') lastId?: string,
    // @Query('limit') limit?: string
  ) {
    // const parsedLimit = parseInt(limit, 10);
    // const size = isNaN(parsedLimit) ? USER_CONSTANTS.DEFAULT_USERS_LIMIT : parsedLimit;
    
    // return this.userService.getAllUsers(lastId, size);
    return this.userService.getAllUsers();
  }

  // Получение пользователей по выбранному графу
  @Get('allUsersByGraph/:graphId')
  async getUsersBySelectedGraph(
    @Param('graphId') graphId: string
  ) {
    return this.userService.getUsersBySelectedGraph(graphId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req) {
    return req.user;
  }

  // Выбор графа пользователя
  @UseGuards(JwtAuthGuard)
  @Patch('selected-graph')
  @Auth()
  async updateSelectedGraph(
    @CurrentUser('_id') userId: Types.ObjectId,
    @Body('selectedGraphId') selectedGraphId: string
  ) {
    if (!selectedGraphId) {
      throw new UnauthorizedException('ID графа не указан');
    }
    
    return this.userService.updateSelectedGraph(
      userId,
      selectedGraphId
    );
  }

  // Обновление данных профиля
  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  @Auth()
  async updateProfile(
    @CurrentUser('_id') userId: Types.ObjectId,
    @Body() dto: UpdateUserDto
  ) {
    return this.userService.updateProfile(userId, dto);
  }

  // Получение всех пользователей с null telegramId
  @Get('without-telegram-id')
  async getUsersWithoutTelegramId() {
    return this.userService.findUsersWithNullTelegramId();
  }

  // Удаление всех пользователей с null telegramId
  @Delete('without-telegram-id')
  async deleteUsersWithoutTelegramId() {
    return this.userService.deleteUsersWithNullTelegramId();
  }

  // Установка isStudent: true для всех пользователей
  @Patch('set-all-as-students')
  async setAllUsersAsStudents() {
    return this.userService.setAllUsersAsStudents();
  }
}
