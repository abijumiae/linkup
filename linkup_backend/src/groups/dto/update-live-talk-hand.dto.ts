import { IsBoolean } from 'class-validator';

export class UpdateLiveTalkHandDto {
  @IsBoolean()
  handRaised!: boolean;
}
