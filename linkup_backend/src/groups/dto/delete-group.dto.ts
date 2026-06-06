import { IsString, MinLength } from 'class-validator';

export class DeleteGroupDto {
  @IsString()
  @MinLength(1)
  confirmName!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}
