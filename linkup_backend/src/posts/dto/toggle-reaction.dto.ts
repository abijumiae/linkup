import { IsIn, IsString } from 'class-validator';
import { ALLOWED_REACTION_EMOJIS } from '../../common/reaction-emojis';

export class ToggleReactionDto {
  @IsString()
  @IsIn([...ALLOWED_REACTION_EMOJIS])
  emoji!: string;
}
