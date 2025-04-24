import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { OPTIONAL_AUTH_KEY } from '../decorators/optionalAuth.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  // Основной метод гварда, который определяет, может ли запрос быть обработан
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Проверяем, является ли текущий эндпоинт опционально авторизованным
    // (используя декоратор @OptionalAuth())
    const isOptionalAuth = this.reflector.getAllAndOverride<boolean>(OPTIONAL_AUTH_KEY, [
      context.getHandler(),  // Проверяем на уровне метода
      context.getClass(),    // Проверяем на уровне класса
    ]);

    // Получаем HTTP запрос из контекста
    const request = context.switchToHttp().getRequest();
    // Извлекаем JWT токен из заголовка Authorization
    const token = this.extractTokenFromHeader(request);

    // Если токен отсутствует
    if (!token) {
      // Для опциональной авторизации разрешаем доступ
      if (isOptionalAuth) {
        return true;
      }
      // Для обязательной авторизации запрещаем доступ
      return false;
    }

    try {
      // Пытаемся верифицировать токен
      const payload = await this.jwtService.verifyAsync(token);
      // Если токен валиден, сохраняем payload в request.user
      // для дальнейшего использования в контроллере
      request.user = payload;
      return true;
    } catch {
      // Если токен невалиден
      if (isOptionalAuth) {
        // Для опциональной авторизации разрешаем доступ
        return true;
      }
      // Для обязательной авторизации запрещаем доступ
      return false;
    }
  }

  // Вспомогательный метод для извлечения токена из заголовка Authorization
  private extractTokenFromHeader(request: any): string | undefined {
    // Разбиваем заголовок Authorization на тип и токен
    // Например: "Bearer eyJhbGciOiJIUzI1NiIs..."
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    // Возвращаем токен только если тип авторизации - Bearer
    return type === 'Bearer' ? token : undefined;
  }
} 