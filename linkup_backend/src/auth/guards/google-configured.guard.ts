import {
  CanActivate,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

@Injectable()
export class GoogleConfiguredGuard implements CanActivate {
  canActivate(): boolean {
    const configured = Boolean(
      process.env.GOOGLE_CLIENT_ID &&
        process.env.GOOGLE_CLIENT_SECRET &&
        process.env.GOOGLE_CALLBACK_URL,
    );

    if (!configured) {
      throw new ServiceUnavailableException(
        'Google sign-in is not configured on this server',
      );
    }

    return true;
  }
}
