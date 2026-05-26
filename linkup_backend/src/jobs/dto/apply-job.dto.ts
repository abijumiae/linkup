import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ApplyJobDto {
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  coverLetter?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  resumeUrl?: string;
}
