import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CompleteOnboardingDto } from './dto/onboarding.dto';
import { SignupDto } from './dto/signup.dto';
import {
  ResendVerificationDto,
  VerifyEmailDto,
} from './dto/verify-email.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleProfilePayload } from './strategies/google.strategy';
import { SafeUser } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() dto: SignupDto) {
    console.log('Signup request received:', {
      email: dto.email,
      username: dto.username,
    });
    return this.authService.signup(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    console.log('Login attempt:', { email: dto.email.toLowerCase() });
    return this.authService.login(dto);
  }

  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('resend-verification')
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: { user: SafeUser }) {
    return { user: req.user };
  }

  @Patch('onboarding')
  @UseGuards(JwtAuthGuard)
  completeOnboarding(
    @Req() req: { user: SafeUser },
    @Body() dto: CompleteOnboardingDto,
  ) {
    console.log('Onboarding request received for user:', req.user.id);
    return this.authService.completeOnboarding(req.user.id, dto);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    return;
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @Req() req: { user: GoogleProfilePayload },
    @Res() res: Response,
  ) {
    const result = await this.authService.handleGoogleUser(req.user);
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3001';
    const params = new URLSearchParams({
      token: result.accessToken,
      onboarded: String(result.user.isOnboarded),
    });

    res.redirect(`${frontendUrl}/auth/google/callback?${params.toString()}`);
  }
}
