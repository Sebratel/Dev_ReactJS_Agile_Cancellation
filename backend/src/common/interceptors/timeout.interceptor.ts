import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  RequestTimeoutException,
} from '@nestjs/common';
import { catchError, Observable, throwError, timeout } from 'rxjs';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      timeout(10_000),
      catchError((error: unknown) => {
        if (error instanceof Error && error.name === 'TimeoutError') {
          return throwError(
            () => new RequestTimeoutException('Request timed out.'),
          );
        }

        return throwError(() => error);
      }),
    );
  }
}
