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

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isOptionalAuth = this.reflector.getAllAndOverride<boolean>(OPTIONAL_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    console.log('Token:', token);

    if (!token) {
      if (isOptionalAuth) {
        return true;
      }
      return false;
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      console.log('Payload:', payload);
      request.user = payload;
      return true;
    } catch (error) {
      console.log('JWT verification error:', error);
      if (isOptionalAuth) {
        return true;
      }
      return false;
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
} 