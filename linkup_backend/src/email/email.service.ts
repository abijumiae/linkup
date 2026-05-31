import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { buildFrontendPath } from '../common/frontend-url';
import { getMailFromAddress } from '../common/mail-from';

export type VerificationEmailPayload = {
  to: string;
  name: string;
  code: string;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  isConfigured(): boolean {
    return Boolean(
      process.env.SMTP_HOST &&
        process.env.SMTP_PORT &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS &&
        getMailFromAddress(),
    );
  }

  async sendVerificationEmail(
    payload: VerificationEmailPayload,
  ): Promise<'sent' | 'logged'> {
    const verifyUrl = buildFrontendPath(
      `/verify-email?email=${encodeURIComponent(payload.to)}`,
    );
    const subject = 'Verify your LinkUp email';
    const text = [
      `Hi ${payload.name},`,
      '',
      'Welcome to LinkUp. Use this verification code to activate your account:',
      '',
      payload.code,
      '',
      `Or open LinkUp to verify: ${verifyUrl}`,
      '',
      'This code expires in 30 minutes.',
      '',
      'If you did not create a LinkUp account, you can ignore this email.',
    ].join('\n');

    if (!this.isConfigured()) {
      this.logger.warn(
        `SMTP not configured. Verification code for ${payload.to}: ${payload.code}`,
      );
      return 'logged';
    }

    const smtpPort = Number(process.env.SMTP_PORT);
    const smtpSecure =
      process.env.SMTP_SECURE === 'true' ||
      process.env.SMTP_SECURE === '1' ||
      smtpPort === 465;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: getMailFromAddress(),
      to: payload.to,
      subject,
      text,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h2 style="margin-bottom: 8px;">Verify your LinkUp email</h2>
          <p>Hi ${payload.name},</p>
          <p>Welcome to LinkUp. Use this verification code to activate your account:</p>
          <p style="font-size: 28px; font-weight: 700; letter-spacing: 0.3em; color: #6d28d9;">${payload.code}</p>
          <p><a href="${verifyUrl}" style="color: #6d28d9; font-weight: 600;">Open LinkUp to verify your email</a></p>
          <p>This code expires in 30 minutes.</p>
          <p style="color: #6b7280;">If you did not create a LinkUp account, you can ignore this email.</p>
        </div>
      `,
    });

    this.logger.log(`Verification email sent to ${payload.to}`);
    return 'sent';
  }
}
