import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const isProd = process.env.NODE_ENV === 'production';
    const route = `${request.method} ${request.url}`;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: Record<string, unknown> = {
      statusCode: status,
      message: 'Internal server error',
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      if (status >= 500) {
        this.logger.error(
          `${route} → ${status}: ${exception.message}`,
          isProd ? undefined : exception.stack,
        );
      }
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        body = { statusCode: status, message: exceptionResponse };
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        body = exceptionResponse as Record<string, unknown>;
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `${route} → 500: ${exception.message}`,
        isProd ? undefined : exception.stack,
      );

      if (!isProd) {
        body = {
          statusCode: status,
          message: exception.message,
        };
      }
    } else {
      this.logger.error(`${route} → 500: Unhandled exception`);
    }

    response.status(status).json(body);
  }
}
