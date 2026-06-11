import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const adminAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (
        err instanceof HttpErrorResponse &&
        err.status === 401 &&
        req.url.includes('/api/admin/') &&
        !req.url.endsWith('/api/admin/login')
      ) {
        router.navigate(['/admin/login']);
      }
      return throwError(() => err);
    }),
  );
};
