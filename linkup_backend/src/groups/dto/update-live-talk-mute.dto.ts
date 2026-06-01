import { IsBoolean } from 'class-validator';

export class UpdateLiveTalkMuteDto {
  @IsBoolean()
  isMuted!: boolean;
}
