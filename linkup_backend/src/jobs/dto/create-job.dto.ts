import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateJobDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  company: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  description: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  location: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  jobType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  salary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  requirements?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(120)
  contactEmail?: string;
}
