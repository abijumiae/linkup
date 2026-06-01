import { IsString, MinLength } from 'class-validator';

export class PassLiveTalkMicDto {
  @IsString()
  @MinLength(1)
  targetUserId!: string;
}
