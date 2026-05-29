import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMomentDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  content?: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsIn(['image', 'video', 'text'])
  mediaType?: string;

  @IsOptional()
  @IsString()
  background?: string;
}
