import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content?: string;

  @ValidateIf((dto: UpdatePostDto) => dto.mediaUrl != null && dto.mediaUrl !== '')
  @IsOptional()
  @IsUrl({ require_tld: false })
  mediaUrl?: string | null;

  @IsOptional()
  @IsIn(['image', 'video'])
  mediaType?: 'image' | 'video' | null;

  @IsOptional()
  @IsBoolean()
  removeMedia?: boolean;
}
