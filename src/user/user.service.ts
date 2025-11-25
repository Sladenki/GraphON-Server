import { Inject, Injectable, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { ModelType } from '@typegoose/typegoose/lib/types';
import { InjectModel } from '@m8a/nestjs-typegoose';
import { UserModel } from './user.model';
import { JwtAuthService } from '../jwt/jwt.service';
import { AuthUserDto } from './dto/auth-user.dto';
import { Types } from 'mongoose';
import { GraphModel } from 'src/graph/graph.model';
import { USER_CONSTANTS } from '../constants/user.constants';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    // Обращаемся к БД модели user
    @InjectModel(UserModel) private readonly UserModel: ModelType<UserModel>,
    @InjectModel(GraphModel) private readonly GraphModel: ModelType<GraphModel>,

    // Для JWT токена
    private jwtAuthService: JwtAuthService,

  ) {}

  // --- Вход или регистрация пользователя ---
  async auth(dto: AuthUserDto) {

    const user = await this.UserModel.findOneAndUpdate(
      { email: dto.email },
      // Указывает значения, которые будут установлены только при вставке нового документа.
      {
        $setOnInsert: {
          email: dto.email,
          name: dto.name,
          avaPath: dto.image,
        },
      },
      {
        new: true, // Возвращает обновленный документ, если найден
        upsert: true, // Создает новый документ, если не найден
      },
    );

    // @ts-ignore
    const mainData = user?._doc;

    return {
      ...mainData,
      // Вшиваем в токен id пользователя
      token: this.jwtAuthService.generateToken(mainData._id.toString(), 'user'),
    };
  }

  // --- Получение данных пользователя по его ID ---
  async getUserById(_id: Types.ObjectId) {
    const user = await this.UserModel.findById(_id)
      .lean()
      // Убираем поля
      .select({ email: 0, __v: 0, createdAt: 0, updatedAt: 0 })
      .populate('selectedGraphId', 'name');

    return user;
  }

  // --- Получение всех пользователей ---
  async getAllUsers() {
    const users = await this.UserModel
      .find()
      .sort({ _id: -1 })
      .lean()
      .select({ createdAt: 1, updatedAt: 0 });

    return users;
  }

  // --- Получение пользователей по выбранному графу ---
  async getUsersBySelectedGraph(graphId: string) {
    const users = await this.UserModel
      .find({ selectedGraphId: new Types.ObjectId(graphId) })
      .populate('managedGraphIds', 'name')
      .lean()
      .select({ createdAt: 0, updatedAt: 0 });

    return users;
  }
  // async getAllUsers(lastId?: string, limit: number = USER_CONSTANTS.DEFAULT_USERS_LIMIT) {
  //   const query: any = {};
    
  //   if (lastId) {
  //     query._id = { $gt: new Types.ObjectId(lastId) };
  //   }

  //   const users = await this.UserModel
  //     .find(query)
  //     .sort({ _id: 1 })
  //     .limit(limit)
  //     .lean()
  //     .select({ createdAt: 0, updatedAt: 0 });

  //   return {
  //     users,
  //     hasMore: users.length === limit
  //   };
  // }

  async generateToken(userId: string, role: string): Promise<string> {
    return this.jwtAuthService.generateToken(new Types.ObjectId(userId), role);
  }

  async updateSelectedGraph(userId: Types.ObjectId, selectedGraphId: string) {
    try {
      const updatedUser = await this.UserModel.findByIdAndUpdate(
        userId,
        { selectedGraphId },
        { new: true }
      ).lean();

      if (!updatedUser) {
        throw new NotFoundException('Пользователь не найден');
      }

      return updatedUser;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Ошибка при обновлении выбранного графа');
    }
  }

  // --- Обновление профиля пользователя ---
  async updateProfile(userId: Types.ObjectId, dto: UpdateUserDto) {
    try {
      const updatePayload: Record<string, any> = {};

      if (dto.firstName !== undefined) updatePayload.firstName = dto.firstName;
      if (dto.lastName !== undefined) updatePayload.lastName = dto.lastName;
      if (dto.username !== undefined) updatePayload.username = dto.username;
      if (dto.gender !== undefined) updatePayload.gender = dto.gender;
      if (dto.birthDate !== undefined) updatePayload.birthDate = new Date(dto.birthDate);

      if (Object.keys(updatePayload).length === 0) {
        throw new BadRequestException('Нет данных для обновления');
      }

      const updatedUser = await this.UserModel.findByIdAndUpdate(
        userId,
        { $set: updatePayload },
        { new: true }
      )
        .lean()
        .select({ email: 0, __v: 0, createdAt: 0 });

      if (!updatedUser) {
        throw new NotFoundException('Пользователь не найден');
      }

      return updatedUser;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Ошибка при обновлении профиля пользователя');
    }
  }

  // --- Поиск пользователя по Telegram ID ---
  async findByTelegramId(telegramId: number) {
    try {
      // Ищем пользователя как по числу, так и по строке
      const user = await this.UserModel.findOne({
        $or: [
          { telegramId: telegramId },
          { telegramId: telegramId.toString() }
        ]
      })
        .lean()
        .exec();
      
      return user;
    } catch (error) {
      console.error('Error finding user by Telegram ID:', error);
      return null;
    }
  }

  // --- Принятие соглашения об авторских правах ---
  async acceptCopyrightAgreement(telegramId: number) {
    try {
      const now = new Date();
      
      // Ищем пользователя как по числу, так и по строке
      let user = await this.UserModel.findOne({
        $or: [
          { telegramId: telegramId },
          { telegramId: telegramId.toString() }
        ]
      }).lean();
      
      if (user) {
        // Пользователь найден - обновляем его
        user = await this.UserModel.findByIdAndUpdate(
          user._id,
          {
            $set: {
              copyrightAgreementAccepted: true,
              copyrightAgreementAcceptedAt: now
            }
          },
          { new: true }
        ).lean();
        
        console.log(`Existing user ${user._id} (telegramId: ${telegramId}) accepted copyright agreement at ${now}`);
      } else {
        // Пользователь не найден - создаем минимальную запись только для соглашения
        user = await this.UserModel.create({
          telegramId: telegramId.toString(), // Сохраняем как строку для консистентности
          copyrightAgreementAccepted: true,
          copyrightAgreementAcceptedAt: now,
          role: 'user'
        });
        
        console.log(`New user created for telegramId ${telegramId} with copyright agreement accepted at ${now}`);
      }
      
      return user;
    } catch (error) {
      console.error('Error accepting copyright agreement:', error);
      throw new InternalServerErrorException('Ошибка при сохранении принятия соглашения');
    }
  }

  // --- Проверка принятия соглашения об авторских правах ---
  async hasAcceptedCopyrightAgreement(telegramId: number): Promise<boolean> {
    try {
      const user = await this.UserModel.findOne({
        $or: [
          { telegramId: telegramId },
          { telegramId: telegramId.toString() }
        ]
      })
        .select('copyrightAgreementAccepted')
        .lean()
        .exec();
      
      return user?.copyrightAgreementAccepted || false;
    } catch (error) {
      console.error('Error checking copyright agreement:', error);
      return false;
    }
  }

  // --- Миграция telegramId к строковому типу ---
  async migrateTelegramIdsToString() {
    try {
      // Находим всех пользователей с числовым telegramId
      const usersWithNumericTelegramId = await this.UserModel.find({
        telegramId: { $type: 'number' }
      }).lean();

      console.log(`Found ${usersWithNumericTelegramId.length} users with numeric telegramId`);

      for (const user of usersWithNumericTelegramId) {
        await this.UserModel.findByIdAndUpdate(
          user._id,
          { telegramId: user.telegramId.toString() }
        );
        console.log(`Migrated user ${user._id}: telegramId ${user.telegramId} -> "${user.telegramId}"`);
      }

      console.log('TelegramId migration completed');
    } catch (error) {
      console.error('Error during telegramId migration:', error);
    }
  }

  // --- Поиск всех пользователей с null telegramId ---
  async findUsersWithNullTelegramId() {
    try {
      const users = await this.UserModel
        .find({
          $or: [
            { telegramId: null },
            { telegramId: { $exists: false } }
          ]
        })
        .lean()
        .select({ createdAt: 0, updatedAt: 0 });
      
      return users;
    } catch (error) {
      console.error('Error finding users with null telegramId:', error);
      throw new InternalServerErrorException('Ошибка при поиске пользователей с null telegramId');
    }
  }

  // --- Бэкофил managedGraphIds на основе Graph.ownerUserId ---
  async backfillManagedGraphs() {
    try {
      // Находим все графы с ownerUserId
      const graphs = await this.GraphModel.find({ ownerUserId: { $exists: true, $ne: null } })
        .select({ _id: 1, ownerUserId: 1 })
        .lean();

      // Собираем соответствие userId -> массив graphIds
      const userIdToGraphIds = new Map<string, string[]>();
      for (const graph of graphs) {
        const ownerId = (graph as any).ownerUserId?.toString();
        if (!ownerId) continue;
        const arr = userIdToGraphIds.get(ownerId) || [];
        arr.push((graph as any)._id.toString());
        userIdToGraphIds.set(ownerId, arr);
      }

      let updatedUsers = 0;
      for (const [userId, graphIds] of userIdToGraphIds.entries()) {
        await this.UserModel.findByIdAndUpdate(
          userId,
          { $set: { managedGraphIds: graphIds } },
          { new: false }
        );
        updatedUsers += 1;
      }

      return { updatedUsers, totalGraphs: graphs.length };
    } catch (error) {
      console.error('Error during backfillManagedGraphs:', error);
      throw new InternalServerErrorException('Ошибка при бэкофиле managedGraphIds');
    }
  }

}
