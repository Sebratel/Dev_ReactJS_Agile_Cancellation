import {
  HttpException,
  type HttpExceptionOptions,
  type HttpStatus,
} from '@nestjs/common';

export class AppException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus,
    options?: HttpExceptionOptions & { code?: string; details?: string },
  ) {
    super(
      {
        message,
        code: options?.code,
        details: options?.details,
      },
      status,
      options,
    );
  }
}
