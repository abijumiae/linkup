import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Injectable()
export class WsAuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async authenticateToken(token?: string) {
    if (!token) {
      throw new UnauthorizedException('Missing auth token');
    }

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const userId = (payload.sub || (payload as { id?: string }).id) as string;
    if (!userId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.usersService.sanitize(user);
  }
}
