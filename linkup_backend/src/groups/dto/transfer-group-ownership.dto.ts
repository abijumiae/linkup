import { IsString, MinLength } from 'class-validator';

export class TransferGroupOwnershipDto {
  @IsString()
  @MinLength(1)
  targetUserId!: string;
}
