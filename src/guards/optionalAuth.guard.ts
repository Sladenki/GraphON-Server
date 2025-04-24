import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OPTIONAL_AUTH_KEY } from '../decorators/optionalAuth.decorator';

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isOptionalAuth = this.reflector.getAllAndOverride<boolean>(OPTIONAL_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Всегда разрешаем запрос, если это необязательная авторизация
    if (isOptionalAuth) {
      return true;
    }

    // Для других случаев проверяем наличие пользователя
    const request = context.switchToHttp().getRequest();
    return request.user !== undefined;
  }
} 