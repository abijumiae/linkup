import { IsIn, IsString } from 'class-validator';

export class SetHubAdminDto {
  @IsString()
  targetUserId!: string;

  @IsIn(['ADMIN', 'MODERATOR'])
  role!: 'ADMIN' | 'MODERATOR';
}
