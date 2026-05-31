import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateReportDto {
  @IsIn(['POST', 'USER'])
  targetType!: 'POST' | 'USER';

  @IsString()
  @MaxLength(64)
  targetId!: string;

  @IsString()
  @MaxLength(120)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}
