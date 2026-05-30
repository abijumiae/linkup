import { IsIn, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsIn(['PERSONAL', 'CREATOR', 'BUSINESS', 'STUDENT', 'PROFESSIONAL'])
  accountType?: 'PERSONAL' | 'CREATOR' | 'BUSINESS' | 'STUDENT' | 'PROFESSIONAL';

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @IsOptional()
  @IsUrl()
  coverUrl?: string;

  @IsOptional()
  @IsString()
  bio?: string;
}
