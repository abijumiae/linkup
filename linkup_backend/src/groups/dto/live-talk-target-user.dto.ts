import { IsBoolean, IsString, MinLength } from 'class-validator';

export class LiveTalkTargetUserDto {
  @IsString()
  @MinLength(1)
  targetUserId!: string;
}

export class LiveTalkMuteParticipantDto {
  @IsString()
  @MinLength(1)
  targetUserId!: string;

  @IsBoolean()
  isMuted!: boolean;
}
