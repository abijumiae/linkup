import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

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
  @IsString()
  @MaxLength(2048)
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  coverUrl?: string;

  @IsOptional()
  @IsString()
  bio?: string;
}
