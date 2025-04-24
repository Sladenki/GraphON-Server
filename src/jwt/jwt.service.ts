import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Types } from 'mongoose';

@Injectable()
export class JwtAuthService {
  constructor(private readonly jwtService: JwtService) {}

  generateToken(userId: Types.ObjectId, role?: string) {
    const payload = { sub: userId.toString(), role };
    return this.jwtService.sign(payload, { expiresIn: '30d' });
  }

  verifyToken(token: string) {
    return this.jwtService.verifyAsync(token);
  }

  extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
} 