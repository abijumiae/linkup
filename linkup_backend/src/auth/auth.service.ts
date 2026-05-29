import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes, randomInt } from 'crypto';
import { User } from '../generated/prisma/client';
import { EmailService } from '../email/email.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { CompleteOnboardingDto } from './dto/onboarding.dto';
import { ResendVerificationDto } from './dto/verify-email.dto';
import { SignupDto } from './dto/signup.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { GoogleProfilePayload } from './strategies/google.strategy';

const VERIFICATION_EXPIRY_MINUTES = 30;

@Injectable()
export class AuthService {
  private readonly saltRounds = 10;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
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
      const verification = await this.createVerificationPayload();

      const user = await this.usersService.create({
        name: dto.name,
        username: dto.username,
        email,
        passwordHash,
        provider: 'local',
        isOnboarded: true,
        isEmailVerified: false,
        accountType: dto.accountType,
        country: dto.country,
        language: dto.language ?? 'en',
      });

      await this.usersService.setEmailVerification(user.id, {
        codeHash: verification.codeHash,
        token: verification.token,
        expiresAt: verification.expiresAt,
      });

      const delivery = await this.emailService.sendVerificationEmail({
        to: email,
        name: dto.name,
        code: verification.plainCode,
      });

      console.log('Signup successful:', { email, username: dto.username });

      return {
        message:
          delivery === 'sent'
            ? 'Account created. Please check your email for the verification code.'
            : 'Account created. Email delivery is pending — check server logs for the verification code in development.',
        email,
        emailDelivery: delivery,
      };
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

  async verifyEmail(dto: VerifyEmailDto) {
    const email = dto.email.toLowerCase();
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new BadRequestException('Invalid verification request');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    if (
      !user.emailVerificationCode ||
      !user.emailVerificationExpires ||
      user.emailVerificationExpires < new Date()
    ) {
      throw new BadRequestException(
        'Verification code has expired. Please request a new one.',
      );
    }

    const codeMatches = await bcrypt.compare(
      dto.code,
      user.emailVerificationCode,
    );

    if (!codeMatches) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.usersService.markEmailVerified(user.id);

    return {
      message: 'Email verified successfully. You can now log in.',
      email,
    };
  }

  async resendVerification(dto: ResendVerificationDto) {
    const email = dto.email.toLowerCase();
    const user = await this.usersService.findByEmail(email);

    if (!user || user.provider !== 'local') {
      return {
        message:
          'If an unverified account exists for this email, a new verification code has been sent.',
      };
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const verification = await this.createVerificationPayload();
    await this.usersService.setEmailVerification(user.id, {
      codeHash: verification.codeHash,
      token: verification.token,
      expiresAt: verification.expiresAt,
    });

    const delivery = await this.emailService.sendVerificationEmail({
      to: email,
      name: user.name,
      code: verification.plainCode,
    });

    return {
      message:
        delivery === 'sent'
          ? 'A new verification code has been sent to your email.'
          : 'Verification email setup is pending. Check server logs for the verification code in development.',
      email,
      emailDelivery: delivery,
    };
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

    if (!user.isEmailVerified) {
      throw new ForbiddenException(
        'Please verify your email before logging in.',
      );
    }

    const accessToken = await this.createAccessToken(user);

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

  async completeOnboarding(userId: string, dto: CompleteOnboardingDto) {
    console.log('Onboarding submit:', {
      userId,
      username: dto.username,
      accountType: dto.accountType,
    });

    const existingUser = await this.usersService.findById(userId);

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

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

  private async createVerificationPayload() {
    const plainCode = randomInt(100000, 1000000).toString();
    const codeHash = await bcrypt.hash(plainCode, this.saltRounds);
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(
      Date.now() + VERIFICATION_EXPIRY_MINUTES * 60 * 1000,
    );

    return {
      plainCode,
      codeHash,
      token,
      expiresAt,
    };
  }
}
