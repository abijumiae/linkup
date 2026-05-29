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

export class CreateMessageDto {
  @ValidateIf((dto: CreateMessageDto) => (dto.type ?? 'text') !== 'voice')
  @IsString()
  @IsNotEmpty()
  content?: string;

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
