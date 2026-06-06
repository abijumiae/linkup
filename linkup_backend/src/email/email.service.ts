import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type Transporter from 'nodemailer/lib/mailer';
import { buildFrontendPath } from '../common/frontend-url';
import { getMailFromAddress } from '../common/mail-from';

export type VerificationEmailPayload = {
  to: string;
  name: string;
  token: string;
  code: string;
};

export type EmailDeliveryResult = 'sent' | 'logged' | 'failed';

export type SmtpStatus = {
  configured: boolean;
  host: string | null;
  port: number | null;
  user: string | null;
  from: string | null;
  appUrl: string;
  ready: boolean;
  lastError: string | null;
};

const VERIFICATION_EXPIRY_MINUTES = 30;

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private lastSmtpError: string | null = null;
  private smtpReady = false;

  async onModuleInit(): Promise<void> {
    const status = this.getStatus();

    if (!status.configured) {
      this.logger.warn(
        'SMTP not configured — verification emails will be logged only. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM on Render.',
      );
      return;
    }

    const verified = await this.verifyConnection();
    if (verified) {
      this.logger.log(
        `SMTP ready (${status.host}:${status.port}, from ${status.from})`,
      );
    }
  }

  isConfigured(): boolean {
    return Boolean(
      process.env.SMTP_HOST?.trim() &&
        process.env.SMTP_PORT?.trim() &&
        process.env.SMTP_USER?.trim() &&
        process.env.SMTP_PASS?.trim() &&
        getMailFromAddress(),
    );
  }

  getStatus(): SmtpStatus {
    const host = process.env.SMTP_HOST?.trim() || null;
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : null;

    return {
      configured: this.isConfigured(),
      host,
      port: Number.isFinite(port) ? port : null,
      user: process.env.SMTP_USER?.trim() || null,
      from: getMailFromAddress() || null,
      appUrl: buildFrontendPath('/'),
      ready: this.smtpReady,
      lastError: this.lastSmtpError,
    };
  }

  private createTransporter(): Transporter {
    const smtpPort = Number(process.env.SMTP_PORT);
    const smtpSecure =
      process.env.SMTP_SECURE === 'true' ||
      process.env.SMTP_SECURE === '1' ||
      smtpPort === 465;

    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  private classifySmtpError(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    const lower = message.toLowerCase();

    if (
      lower.includes('auth') ||
      lower.includes('credentials') ||
      lower.includes('535') ||
      lower.includes('invalid login')
    ) {
      return 'smtp_authentication_error';
    }

    if (lower.includes('timeout') || lower.includes('timed out')) {
      return 'smtp_timeout';
    }

    return 'smtp_send_failed';
  }

  private recordSmtpFailure(error: unknown, context: string): void {
    const kind = this.classifySmtpError(error);
    const message = error instanceof Error ? error.message : String(error);
    this.lastSmtpError = message;
    this.smtpReady = false;

    if (kind === 'smtp_authentication_error') {
      this.logger.error(
        `SMTP authentication failed during ${context}: ${message}`,
      );
      return;
    }

    this.logger.error(`Email failed during ${context}: ${message}`);
  }

  async verifyConnection(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const transporter = this.createTransporter();
      await transporter.verify();
      this.smtpReady = true;
      this.lastSmtpError = null;
      return true;
    } catch (error) {
      this.recordSmtpFailure(error, 'smtp_verify');
      return false;
    }
  }

  async sendVerificationEmail(
    payload: VerificationEmailPayload,
  ): Promise<EmailDeliveryResult> {
    const verifyUrl = buildFrontendPath(
      `/verify-email?token=${encodeURIComponent(payload.token)}`,
    );
    const subject = 'Verify your LinkUp account';
    const text = [
      `Hi ${payload.name},`,
      '',
      'Welcome to LinkUp! Please verify your email address to activate your account.',
      '',
      `Verify your email: ${verifyUrl}`,
      '',
      `Or enter this code on the verification page: ${payload.code}`,
      '',
      `This link expires in ${VERIFICATION_EXPIRY_MINUTES} minutes.`,
      '',
      'If you did not create a LinkUp account, you can ignore this email.',
    ].join('\n');

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 560px;">
        <h2 style="margin-bottom: 8px; color: #4b1f9d;">Verify your LinkUp account</h2>
        <p>Hi ${payload.name},</p>
        <p>Welcome to LinkUp! Click the button below to verify your email and activate your account.</p>
        <p style="margin: 28px 0;">
          <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(90deg, #4b1f9d, #3c7be2); color: #ffffff; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 999px;">
            Verify Email
          </a>
        </p>
        <p style="font-size: 13px; color: #6b7280;">Or copy this link into your browser:<br><a href="${verifyUrl}" style="color: #4b1f9d; word-break: break-all;">${verifyUrl}</a></p>
        <p style="font-size: 13px; color: #6b7280;">Backup code: <strong style="letter-spacing: 0.2em;">${payload.code}</strong></p>
        <p style="font-size: 13px; color: #6b7280;">This link expires in ${VERIFICATION_EXPIRY_MINUTES} minutes.</p>
        <p style="font-size: 13px; color: #9ca3af;">If you did not create a LinkUp account, you can ignore this email.</p>
      </div>
    `;

    if (!this.isConfigured()) {
      this.logger.warn(
        `[email:not_sent] SMTP not configured. Verification link for ${payload.to}: ${verifyUrl} (code: ${payload.code})`,
      );
      return 'logged';
    }

    try {
      const transporter = this.createTransporter();
      await transporter.sendMail({
        from: getMailFromAddress(),
        to: payload.to,
        subject,
        text,
        html,
      });

      this.smtpReady = true;
      this.lastSmtpError = null;
      this.logger.log(
        `[email:sent] Verification email delivered to ${payload.to}`,
      );
      return 'sent';
    } catch (error) {
      this.recordSmtpFailure(error, 'verification_email');
      this.logger.warn(
        `[email:fallback] Verification link for ${payload.to}: ${verifyUrl} (code: ${payload.code})`,
      );
      return 'failed';
    }
  }

  async sendPasswordResetEmail(payload: {
    to: string;
    name: string;
    token: string;
  }): Promise<EmailDeliveryResult> {
    const resetUrl = buildFrontendPath(
      `/reset-password?token=${encodeURIComponent(payload.token)}`,
    );
    const subject = 'Reset your LinkUp password';
    const text = [
      `Hi ${payload.name},`,
      '',
      'We received a request to reset your LinkUp password.',
      '',
      `Reset your password: ${resetUrl}`,
      '',
      'This link expires in 60 minutes.',
      '',
      'If you did not request this, you can ignore this email.',
    ].join('\n');

    if (!this.isConfigured()) {
      this.logger.warn(
        `[email:not_sent] SMTP not configured. Password reset link for ${payload.to}: ${resetUrl}`,
      );
      return 'logged';
    }

    try {
      const transporter = this.createTransporter();
      await transporter.sendMail({
        from: getMailFromAddress(),
        to: payload.to,
        subject,
        text,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
            <h2 style="margin-bottom: 8px;">Reset your LinkUp password</h2>
            <p>Hi ${payload.name},</p>
            <p>We received a request to reset your LinkUp password.</p>
            <p><a href="${resetUrl}" style="color: #6d28d9; font-weight: 600;">Reset your password</a></p>
            <p>This link expires in 60 minutes.</p>
            <p style="color: #6b7280;">If you did not request this, you can ignore this email.</p>
          </div>
        `,
      });

      this.smtpReady = true;
      this.lastSmtpError = null;
      this.logger.log(
        `[email:sent] Password reset email delivered to ${payload.to}`,
      );
      return 'sent';
    } catch (error) {
      this.recordSmtpFailure(error, 'password_reset_email');
      return 'failed';
    }
  }
}
