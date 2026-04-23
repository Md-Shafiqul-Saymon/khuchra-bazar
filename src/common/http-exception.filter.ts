import {
  ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (response.headersSent || response.writableEnded) {
      return;
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    if (request.headers.accept?.includes('text/html') && !request.path.startsWith('/api/')) {
      return response.status(status).render('pages/404', {
        settings: { siteName: 'খুচরা বাজার' },
        cartCount: 0,
        categories: [],
      });
    }

    response.status(status).json({
      statusCode: status,
      message: typeof message === 'string' ? message : (message as any).message || message,
      timestamp: new Date().toISOString(),
    });
  }
}
