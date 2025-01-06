import { Inject, Injectable } from '@nestjs/common';
import { ModelType } from '@typegoose/typegoose/lib/types';
import { InjectModel } from '@m8a/nestjs-typegoose';
import { UserModel } from './user.model';
import { JwtService } from '@nestjs/jwt';
import { AuthUserDto } from './dto/auth-user.dto';
import { Types } from 'mongoose';
// import { CACHE_MANAGER } from '@nestjs/cache-manager';
// import { Cache } from 'cache-manager';

@Injectable()
export class UserService {
  constructor(
    // Обращаемся к БД модели user
    @InjectModel(UserModel) private readonly UserModel: ModelType<UserModel>,

    // Для JWT токена
    private readonly jwtService: JwtService,

    // Redis
    // @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  // --- Вход или регистрация пользователя ---
  async auth(dto: AuthUserDto) {
    // const redisUserKey = `/user/auth/${dto.email}`;

    // // Попытка получить пользователя из Redis
    // const cachedUser = await this.cacheManager.get<any>(redisUserKey);

    // if (cachedUser) {
    //     return {
    //         ...cachedUser,
    //         token: this.jwtService.sign({ _id: cachedUser._id }),
    //     };
    // }

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

    // await this.cacheManager.set(redisUserKey, mainData);

    const www = {
      ...mainData,
      // Вшиваем в токен id пользователя
      token: this.jwtService.sign({ _id: mainData._id }),
    };

    return {
      ...mainData,
      // Вшиваем в токен id пользователя
      token: this.jwtService.sign({ _id: mainData._id }),
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
}
