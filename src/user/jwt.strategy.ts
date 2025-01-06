import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectModel } from '@m8a/nestjs-typegoose';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ModelType } from '@typegoose/typegoose/lib/types';
import { UserModel } from './user.model';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    @InjectModel(UserModel) private readonly UserModel: ModelType<UserModel>,
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
    return this.UserModel.findById(_id).exec();
  }
}
