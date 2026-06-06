import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { getFrontendUrl } from '../common/frontend-url';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CompleteOnboardingDto } from './dto/onboarding.dto';
import { SignupDto } from './dto/signup.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import {
  ResendVerificationDto,
  VerifyEmailDto,
} from './dto/verify-email.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleConfiguredGuard } from './guards/google-configured.guard';
import { GoogleProfilePayload } from './strategies/google.strategy';
import { SafeUser } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Req() req: { user: SafeUser }) {
    return this.authService.logout(req.user.id);
  }

  @Get('verify-email')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  verifyEmailByToken(@Query('token') token: string) {
    return this.authService.verifyEmailByToken(token);
  }

  @Post('verify-email')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('resend-verification')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: { user: SafeUser }) {
    return { user: req.user };
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  refresh(@Req() req: { user: SafeUser }) {
    return this.authService.refreshSession(req.user);
  }

  @Patch('onboarding')
  @UseGuards(JwtAuthGuard)
  completeOnboarding(
    @Req() req: { user: SafeUser },
    @Body() dto: CompleteOnboardingDto,
  ) {
    return this.authService.completeOnboarding(req.user.id, dto);
  }

  @Get('google/status')
  googleStatus() {
    return { enabled: this.authService.isGoogleConfigured() };
  }

  @Get('google')
  @UseGuards(GoogleConfiguredGuard, AuthGuard('google'))
  googleAuth() {
    return;
  }

  @Get('google/callback')
  @UseGuards(GoogleConfiguredGuard, AuthGuard('google'))
  async googleCallback(
    @Req() req: { user: GoogleProfilePayload },
    @Res() res: Response,
  ) {
    const result = await this.authService.handleGoogleUser(req.user);
    const frontendUrl = getFrontendUrl();
    const params = new URLSearchParams({
      token: result.accessToken,
      onboarded: String(result.user.isOnboarded),
    });

    res.redirect(`${frontendUrl}/auth/google/callback?${params.toString()}`);
  }
}
