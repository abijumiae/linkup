import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../generated/prisma/client';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { OnboardingDto } from './dto/onboarding.dto';
import { SignupDto } from './dto/signup.dto';
import { GoogleProfilePayload } from './strategies/google.strategy';

@Injectable()
export class AuthService {
  private readonly saltRounds = 10;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  isGoogleConfigured(): boolean {
    return Boolean(
      process.env.GOOGLE_CLIENT_ID &&
        process.env.GOOGLE_CLIENT_SECRET &&
        process.env.GOOGLE_CALLBACK_URL,
    );
  }

  ensureGoogleConfigured(): void {
    if (!this.isGoogleConfigured()) {
      throw new ServiceUnavailableException('Google sign-in is not configured');
    }
  }

  async signup(dto: SignupDto) {
    const email = dto.email.toLowerCase();

    console.log('Processing signup:', { email, username: dto.username });

    try {
      if (await this.usersService.findByEmail(email)) {
        throw new ConflictException('Email already exists');
      }

      if (await this.usersService.findByUsername(dto.username)) {
        throw new ConflictException('Username already exists');
      }

      const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);

      const user = await this.usersService.create({
        name: dto.name,
        username: dto.username,
        email,
        passwordHash,
        provider: 'local',
        isOnboarded: true,
        accountType: dto.accountType,
        country: dto.country,
        language: dto.language ?? 'en',
      });

      console.log('Signup successful:', { email, username: dto.username });

      return { user: this.usersService.sanitize(user) };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      console.error('Signup failed:', error);
      throw new InternalServerErrorException(
        'Unable to create account. Please try again.',
      );
    }
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase();
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('This account uses Google sign-in');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });

    return {
      accessToken,
      user: this.usersService.sanitize(user),
    };
  }

  async handleGoogleUser(profile: GoogleProfilePayload) {
    console.log('Google sign-in received:', {
      email: profile.email,
      googleId: profile.googleId,
    });

    try {
      let user =
        (await this.usersService.findByGoogleId(profile.googleId)) ??
        (await this.usersService.findByEmail(profile.email));

      if (user?.googleId && user.googleId !== profile.googleId) {
        throw new ConflictException('Email already linked to another account');
      }

      if (user && !user.googleId) {
        user = await this.usersService.linkGoogleAccount(user.id, profile);
      }

      if (!user) {
        user = await this.usersService.createGoogleUser(profile);
      } else if (profile.avatarUrl && profile.avatarUrl !== user.avatarUrl) {
        user = await this.usersService.linkGoogleAccount(user.id, profile);
      }

      const accessToken = await this.createAccessToken(user);

      return {
        accessToken,
        user: this.usersService.sanitize(user),
      };
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      console.error('Google sign-in failed:', error);
      throw new InternalServerErrorException(
        'Unable to sign in with Google. Please try again.',
      );
    }
  }

  async completeOnboarding(userId: string, dto: OnboardingDto) {
    console.log('Onboarding submit:', {
      userId,
      username: dto.username,
      accountType: dto.accountType,
    });

    try {
      const user = await this.usersService.completeOnboarding(userId, {
        username: dto.username.trim(),
        accountType: dto.accountType,
        country: dto.country.trim(),
        language: dto.language.trim(),
      });

      return { user: this.usersService.sanitize(user) };
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      console.error('Onboarding failed:', error);
      throw new InternalServerErrorException(
        'Unable to complete onboarding. Please try again.',
      );
    }
  }

  private async createAccessToken(user: User): Promise<string> {
    return this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });
  }
}
