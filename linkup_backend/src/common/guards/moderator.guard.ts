import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Role } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SafeUser } from '../../users/users.service';

@Injectable()
export class ModeratorGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: SafeUser }>();
    const userId = request.user?.id;

    if (!userId) {
      throw new ForbiddenException('Moderator access required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || (user.role !== Role.ADMIN && user.role !== Role.MODERATOR)) {
      throw new ForbiddenException('Moderator access required');
    }

    return true;
  }
}
