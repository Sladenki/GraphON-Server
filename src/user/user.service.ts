import { Inject, Injectable } from '@nestjs/common';
import { ModelType } from '@typegoose/typegoose/lib/types';
import { InjectModel } from '@m8a/nestjs-typegoose';
import { UserModel } from './user.model';
import { JwtAuthService } from '../jwt/jwt.service';
import { AuthUserDto } from './dto/auth-user.dto';
import { Types } from 'mongoose';

@Injectable()
export class UserService {
  constructor(
    // Обращаемся к БД модели user
    @InjectModel(UserModel) private readonly UserModel: ModelType<UserModel>,

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
      .select({ _id: 0, email: 0, __v: 0, createdAt: 0, updatedAt: 0 });

    return user;
  }

  // --- Получение всех пользователей ---
  async getAllUsers(limit: number = 100) {
    return this.UserModel
      .find({})
      .limit(limit)
      .lean()
      .select({ createdAt: 0, updatedAt: 0 });
  }

  async generateToken(userId: string, role: string): Promise<string> {
    return this.jwtAuthService.generateToken(new Types.ObjectId(userId), role);
  }

}
