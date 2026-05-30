import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateMessageDto {
  @Transform(({ obj, value }: { obj: Record<string, unknown>; value?: string }) => {
    const normalized =
      (typeof value === 'string' ? value : undefined) ??
      (typeof obj.message === 'string' ? obj.message : undefined) ??
      (typeof obj.text === 'string' ? obj.text : undefined);
    return normalized;
  })
  @ValidateIf((dto: CreateMessageDto) => (dto.type ?? 'text') !== 'voice')
  @IsString()
  @MinLength(1)
  content?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  @IsIn(['text', 'voice', 'image', 'video'])
  type?: 'text' | 'voice' | 'image' | 'video';

  @ValidateIf(
    (dto: CreateMessageDto) =>
      dto.type === 'voice' || dto.type === 'image' || dto.type === 'video',
  )
  @IsUrl()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  mediaType?: string;

  @ValidateIf((dto: CreateMessageDto) => dto.type === 'voice')
  @Type(() => Number)
  @IsInt()
  @Min(1)
  duration?: number;

  @IsOptional()
  @IsString()
  marketplaceItemId?: string;
}
