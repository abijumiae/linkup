import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';

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
  @IsNotEmpty()
  content?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsIn(['text', 'voice'])
  type?: 'text' | 'voice';

  @ValidateIf((dto: CreateMessageDto) => dto.type === 'voice')
  @IsUrl()
  mediaUrl?: string;

  @IsOptional()
  @IsIn(['audio'])
  mediaType?: 'audio';

  @ValidateIf((dto: CreateMessageDto) => dto.type === 'voice')
  @IsInt()
  @Min(1)
  duration?: number;

  @IsOptional()
  @IsString()
  marketplaceItemId?: string;
}
