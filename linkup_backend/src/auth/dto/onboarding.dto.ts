import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { AccountType } from '../../generated/prisma/client';

export class OnboardingDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsEnum(AccountType)
  accountType: AccountType;

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  language: string;
}
