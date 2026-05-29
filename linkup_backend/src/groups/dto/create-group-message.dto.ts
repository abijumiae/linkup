import { IsNotEmpty, IsString } from 'class-validator';

export class CreateGroupMessageDto {
  @IsString()
  @IsNotEmpty()
  content: string;
}
