import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Не выбрасываем ошибку, если пользователь не авторизован
@Injectable()
export class OptionalAuthGuard extends AuthGuard('jwt') {
  handleRequest(err, user, info, context: ExecutionContext) {
    // Если пользователя нет, вернем null вместо ошибки
    return user || null;
  }
}
