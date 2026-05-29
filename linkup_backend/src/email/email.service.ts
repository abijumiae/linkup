import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

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
        process.env.EMAIL_FROM,
    );
  }

  async sendVerificationEmail(
    payload: VerificationEmailPayload,
  ): Promise<'sent' | 'logged'> {
    const subject = 'Verify your LinkUp email';
    const text = [
      `Hi ${payload.name},`,
      '',
      'Welcome to LinkUp. Use this verification code to activate your account:',
      '',
      payload.code,
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

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: payload.to,
      subject,
      text,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h2 style="margin-bottom: 8px;">Verify your LinkUp email</h2>
          <p>Hi ${payload.name},</p>
          <p>Welcome to LinkUp. Use this verification code to activate your account:</p>
          <p style="font-size: 28px; font-weight: 700; letter-spacing: 0.3em; color: #6d28d9;">${payload.code}</p>
          <p>This code expires in 30 minutes.</p>
          <p style="color: #6b7280;">If you did not create a LinkUp account, you can ignore this email.</p>
        </div>
      `,
    });

    this.logger.log(`Verification email sent to ${payload.to}`);
    return 'sent';
  }
}
