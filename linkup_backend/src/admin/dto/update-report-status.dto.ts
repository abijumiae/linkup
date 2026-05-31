import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateReportStatusDto {
  @IsIn(['OPEN', 'REVIEWING', 'REVIEWED', 'RESOLVED', 'DISMISSED'])
  status!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
