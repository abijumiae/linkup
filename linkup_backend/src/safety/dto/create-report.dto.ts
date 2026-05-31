import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const REPORT_CATEGORIES = [
  'Spam',
  'Harassment',
  'Hate or abuse',
  'Violence',
  'Scam or fraud',
  'Nudity or sexual content',
  'Misinformation',
  'Other',
] as const;

export class CreateReportDto {
  @IsIn(['POST', 'USER', 'COMMENT', 'GROUP', 'MARKET', 'JOB', 'EVENT'])
  targetType!:
    | 'POST'
    | 'USER'
    | 'COMMENT'
    | 'GROUP'
    | 'MARKET'
    | 'JOB'
    | 'EVENT';

  @IsString()
  @MaxLength(64)
  targetId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}
