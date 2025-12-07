import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { UserModel, UserDocument } from './user.model';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    @InjectModel(UserModel.name) private readonly userModel: Model<UserDocument>,
  ) {
    super({
      // Указываем откуда будем брать токен
      // Извлечение JWT из заголовка Authorization в формате Bearer Token
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Игнорирование проверки срока действия токена
      ignoreExpiration: true,
      // Секретный ключ для проверки подписи JWT, который находится в папке .evn
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate({ _id }: Pick<UserModel, '_id'>) {
    // Поиск пользователя в базе данных по идентификатору из JWT (по id пользователя)
    return this.userModel.findById(_id).exec();
  }
}
