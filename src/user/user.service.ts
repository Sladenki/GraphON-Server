import { Inject, Injectable, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { UserModel, UserDocument } from './user.model';
import { JwtAuthService } from '../jwt/jwt.service';
import { AuthUserDto } from './dto/auth-user.dto';
import { Types } from 'mongoose';
import { GraphModel, GraphDocument } from 'src/graph/graph.model';
import { USER_CONSTANTS } from '../constants/user.constants';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    // Обращаемся к БД модели user
    @InjectModel(UserModel.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(GraphModel.name) private readonly graphModel: Model<GraphDocument>,

    // Для JWT токена
    private jwtAuthService: JwtAuthService,

  ) {}

  // --- Вход или регистрация пользователя ---
  async auth(dto: AuthUserDto) {

    const user = await this.userModel.findOneAndUpdate(
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
    const user = await this.userModel.findById(_id)
      .lean()
      // Убираем поля
      .select({ email: 0, __v: 0, createdAt: 0, updatedAt: 0 })
      .populate('selectedGraphId', 'name');

    return user;
  }

  // --- Получение всех пользователей ---
  async getAllUsers() {
    const users = await this.userModel
      .find()
      .sort({ _id: -1 })
      .lean();

    return users;
  }

  // --- Порционное получение пользователей (cursor pagination) ---
  // Возвращаем ObjectId-ы и минимальные поля, без populate
  async getUsersPaged(params?: { limit?: number; cursor?: Types.ObjectId }) {
    const limit = Math.min(Math.max(params?.limit ?? USER_CONSTANTS.DEFAULT_USERS_LIMIT ?? 50, 1), 200);

    const query: any = {};
    // Сортируем по _id DESC (новые сверху), поэтому cursor означает "после этого id вниз"
    if (params?.cursor) {
      query._id = { $lt: params.cursor };
    }

    const users = await this.userModel
      .find(query)
      .sort({ _id: -1 })
      .limit(limit)
      .lean();

    const nextCursor = users.length === limit ? (users[users.length - 1] as any)._id?.toString() : undefined;

    return { items: users, nextCursor };
  }

  // --- Получение пользователей по выбранному графу ---
  async getUsersBySelectedGraph(graphId: string) {
    const users = await (this.userModel.find as any)({ selectedGraphId: new Types.ObjectId(graphId) })
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

  //   const users = await this.userModel
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
      // Преобразуем selectedGraphId в ObjectId
      const selectedGraphObjectId = new Types.ObjectId(selectedGraphId);
      
      // Сначала получаем пользователя, чтобы проверить isStudent и universityGraphId
      const user = await this.userModel.findById(userId).lean();
      
      if (!user) {
        throw new NotFoundException('Пользователь не найден');
      }

      // Обновляем selectedGraphId (используем ObjectId)
      const updateFields: any = { selectedGraphId: selectedGraphObjectId };
      
      // Если пользователь студент и universityGraphId еще не заполнен - заполняем его (первая регистрация)
      if (user.isStudent === true && !user.universityGraphId) {
        updateFields.universityGraphId = selectedGraphObjectId;
      }

      const updatedUser = await this.userModel.findByIdAndUpdate(
        userId,
        { $set: updateFields },
        { new: true }
      ).lean();
      
      return updatedUser;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error in updateSelectedGraph:', error);
      throw new InternalServerErrorException('Ошибка при обновлении выбранного графа');
    }
  }

  // --- Обновление университетского графа пользователя ---
  async updateUniversityGraph(userId: Types.ObjectId, universityGraphId: string) {
    try {
      console.log('updateUniversityGraph', userId, universityGraphId);
      
      // Преобразуем universityGraphId в ObjectId
      const universityGraphObjectId = new Types.ObjectId(universityGraphId);
      
      const updatedUser = await this.userModel.findByIdAndUpdate(
        userId,
        { $set: { universityGraphId: universityGraphObjectId } },
        { new: true }
      ).lean();

      console.log('updatedUser', updatedUser);

      if (!updatedUser) {
        throw new NotFoundException('Пользователь не найден');
      }

      return updatedUser;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error in updateUniversityGraph:', error);
      throw new InternalServerErrorException('Ошибка при обновлении университетского графа');
    }
  }

  // --- Обновление статуса студента пользователя ---
  async updateIsStudent(userId: Types.ObjectId, isStudent: boolean) {
    try {
      const updatedUser = await this.userModel.findByIdAndUpdate(
        userId,
        { isStudent },
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
      throw new InternalServerErrorException('Ошибка при обновлении статуса студента');
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

      const updatedUser = await this.userModel.findByIdAndUpdate(
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
      const user = await (this.userModel.findOne as any)({
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
      let user = await (this.userModel.findOne as any)({
        $or: [
          { telegramId: telegramId },
          { telegramId: telegramId.toString() }
        ]
      }).lean();
      
      if (user) {
        // Пользователь найден - обновляем его
        user = await this.userModel.findByIdAndUpdate(
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
        user = await this.userModel.create({
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
      const user = await (this.userModel.findOne as any)({
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

  // --- Удаление пользователя по telegramId ---
  async deleteUserByTelegramId(telegramId: string) {
    try {
      const deletedUser = await (this.userModel.findOneAndDelete as any)({
        $or: [
          { telegramId: telegramId },
          { telegramId: parseInt(telegramId, 10) }
        ]
      }).lean();

      if (!deletedUser) {
        throw new NotFoundException('Пользователь не найден');
      }

      return {
        deletedUser,
        message: `Пользователь с telegramId ${telegramId} удален`
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error deleting user by telegramId:', error);
      throw new InternalServerErrorException('Ошибка при удалении пользователя');
    }
  }

  // --- Миграция telegramId к строковому типу ---
  async migrateTelegramIdsToString() {
    try {
      // Находим всех пользователей с числовым telegramId
      const usersWithNumericTelegramId = await (this.userModel.find as any)({
        telegramId: { $type: 'number' }
      }).lean();

      console.log(`Found ${usersWithNumericTelegramId.length} users with numeric telegramId`);

      for (const user of usersWithNumericTelegramId) {
        await this.userModel.findByIdAndUpdate(
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
      const users = await this.userModel
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

  // --- Удаление всех пользователей с null telegramId ---
  async deleteUsersWithNullTelegramId() {
    try {
      const result = await this.userModel.deleteMany({
        $or: [
          { telegramId: null },
          { telegramId: { $exists: false } }
        ]
      });
      
      return {
        deletedCount: result.deletedCount,
        message: `Удалено пользователей: ${result.deletedCount}`
      };
    } catch (error) {
      console.error('Error deleting users with null telegramId:', error);
      throw new InternalServerErrorException('Ошибка при удалении пользователей с null telegramId');
    }
  }

  // --- Установка isStudent: true для всех пользователей ---
  async setAllUsersAsStudents() {
    try {
      const result = await this.userModel.updateMany(
        {}, // Пустой фильтр - обновляем все документы
        { $set: { isStudent: true } }
      );
      
      return {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        message: `Обновлено пользователей: ${result.modifiedCount} из ${result.matchedCount}`
      };
    } catch (error) {
      console.error('Error setting all users as students:', error);
      throw new InternalServerErrorException('Ошибка при установке isStudent для всех пользователей');
    }
  }

  // --- Миграция selectedGraphId в universityGraphId ---
  async migrateSelectedGraphToUniversityGraph() {
    try {
      // Находим всех пользователей с selectedGraphId
      const usersWithSelectedGraph = await this.userModel.find({
        selectedGraphId: { $exists: true, $ne: null }
      }).select({ _id: 1, selectedGraphId: 1, universityGraphId: 1 }).lean();

      let migratedCount = 0;
      let skippedCount = 0;

      for (const user of usersWithSelectedGraph) {
        // Пропускаем, если universityGraphId уже заполнен
        if (user.universityGraphId) {
          skippedCount++;
          continue;
        }

        // Переносим selectedGraphId в universityGraphId
        await this.userModel.findByIdAndUpdate(
          user._id,
          { $set: { universityGraphId: user.selectedGraphId } },
          { new: false }
        );
        migratedCount++;
      }

      return {
        totalUsers: usersWithSelectedGraph.length,
        migratedCount,
        skippedCount,
        message: `Миграция завершена. Перенесено: ${migratedCount}, пропущено (уже заполнено): ${skippedCount}`
      };
    } catch (error) {
      console.error('Error migrating selectedGraphId to universityGraphId:', error);
      throw new InternalServerErrorException('Ошибка при миграции selectedGraphId в universityGraphId');
    }
  }

  // --- Бэкофил managedGraphIds на основе Graph.ownerUserId ---
  async backfillManagedGraphs() {
    try {
      // Находим все графы с ownerUserId
      const graphs = await this.graphModel.find({ ownerUserId: { $exists: true, $ne: null } })
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
        await this.userModel.findByIdAndUpdate(
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
