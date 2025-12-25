import {
  BadRequestException,
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
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserModel, UserDocument } from './user.model';
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
    // Специальный dev-идентификатор для локальной разработки:
    // /api/user/getById/dev-user-id -> всегда отдаем dev-пользователя.
    if (id === 'dev-user-id' && process.env.NODE_ENV !== 'production') {
      const devId = '6870e8dd6e49885e954e4d25';
      return this.userService.getUserById(new Types.ObjectId(devId));
    }

    // В остальных случаях ожидаем обычный Mongo ObjectId (24-символьная hex-строка).
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Некорректный формат ID пользователя (ожидается Mongo ObjectId)');
    }

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

  // Порционное получение пользователей (cursor pagination)
  // Пример: /api/user/list?limit=50&cursor=656a... (вернет следующую порцию)
  @Get('list')
  async listUsers(
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const parsedLimit = limit ? Number(limit) : undefined;
    const cursorObjId =
      cursor && Types.ObjectId.isValid(cursor) ? new Types.ObjectId(cursor) : undefined;

    return this.userService.getUsersPaged({
      limit: parsedLimit,
      cursor: cursorObjId,
    });
  }

  // Поиск пользователей по имени/фамилии/username
  // Пример: /api/user/search?q=alex&limit=20&cursor=656a...
  @Get('search')
  async searchUsers(
    @Query('q') q: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const parsedLimit = limit ? Number(limit) : undefined;
    const cursorObjId =
      cursor && Types.ObjectId.isValid(cursor) ? new Types.ObjectId(cursor) : undefined;

    return this.userService.searchUsers({
      q,
      limit: parsedLimit,
      cursor: cursorObjId,
    });
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

  // Выбор университетского графа пользователя
  @UseGuards(JwtAuthGuard)
  @Patch('university-graph')
  @Auth()
  async updateUniversityGraph(
    @CurrentUser('_id') userId: Types.ObjectId,
    @Body('universityGraphId') universityGraphId: string
  ) {
    if (!universityGraphId) {
      throw new UnauthorizedException('ID университетского графа не указан');
    }
    
    return this.userService.updateUniversityGraph(
      userId,
      universityGraphId
    );
  }

  // Обновление статуса студента пользователя
  @UseGuards(JwtAuthGuard)
  @Patch('is-student')
  @Auth()
  async updateIsStudent(
    @CurrentUser('_id') userId: Types.ObjectId,
    @Body('isStudent') isStudent: boolean
  ) {
    if (typeof isStudent !== 'boolean') {
      throw new BadRequestException('Поле isStudent должно быть boolean (true или false)');
    }
    
    return this.userService.updateIsStudent(userId, isStudent);
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

  // Миграция selectedGraphId в universityGraphId
  @Post('migrate-selected-to-university-graph')
  async migrateSelectedGraphToUniversityGraph() {
    return this.userService.migrateSelectedGraphToUniversityGraph();
  }

  // Удаление пользователя по telegramId
  @Delete('by-telegram-id/:telegramId')
  async deleteUserByTelegramId(
    @Param('telegramId') telegramId: string
  ) {
    return this.userService.deleteUserByTelegramId(telegramId);
  }
}
