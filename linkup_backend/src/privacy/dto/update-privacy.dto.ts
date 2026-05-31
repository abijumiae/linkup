import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export class UpdatePrivacyDto {
  @IsOptional()
  @IsIn(['public', 'connections', 'private'])
  profileVisibility?: 'public' | 'connections' | 'private';

  @IsOptional()
  @IsIn(['everyone', 'connections', 'none'])
  messagePermission?: 'everyone' | 'connections' | 'none';

  @IsOptional()
  @IsBoolean()
  showOnlineStatus?: boolean;

  @IsOptional()
  @IsBoolean()
  showCountry?: boolean;

  @IsOptional()
  @IsBoolean()
  showActivity?: boolean;
}
