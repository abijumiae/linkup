import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
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
  @ValidateIf((dto: CreateMessageDto) => {
    const messageType = dto.type ?? 'text';
    return messageType !== 'voice' && messageType !== 'audio';
  })
  @IsString()
  @MinLength(1)
  content?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  text?: string;

  @Transform(({ obj, value }: { obj: Record<string, unknown>; value?: string }) => {
    const raw =
      (typeof value === 'string' ? value : undefined) ??
      (typeof obj.type === 'string' ? obj.type : undefined);
    if (!raw) {
      return undefined;
    }
    const normalized = raw.toLowerCase();
    if (normalized === 'audio') {
      return 'voice';
    }
    return normalized;
  })
  @IsOptional()
  @IsString()
  @IsIn(['text', 'voice', 'image', 'video', 'audio'])
  type?: 'text' | 'voice' | 'image' | 'video' | 'audio';

  @Transform(({ obj, value }: { obj: Record<string, unknown>; value?: string }) => {
    return (
      (typeof value === 'string' ? value : undefined) ??
      (typeof obj.audioUrl === 'string' ? obj.audioUrl : undefined)
    );
  })
  @ValidateIf(
    (dto: CreateMessageDto) => {
      const messageType = dto.type ?? 'text';
      return (
        messageType === 'voice' ||
        messageType === 'audio' ||
        messageType === 'image' ||
        messageType === 'video'
      );
    },
  )
  @IsString()
  @MinLength(1)
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  audioUrl?: string;

  @IsOptional()
  @IsString()
  mediaType?: string;

  @Transform(({ obj, value }: { obj: Record<string, unknown>; value?: unknown }) => {
    const resolved = value ?? obj.audioDuration;
    return resolved === undefined || resolved === null ? undefined : Number(resolved);
  })
  @ValidateIf((dto: CreateMessageDto) => {
    const messageType = dto.type ?? 'text';
    return messageType === 'voice' || messageType === 'audio';
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  duration?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  audioDuration?: number;

  @IsOptional()
  @IsString()
  marketplaceItemId?: string;
}
