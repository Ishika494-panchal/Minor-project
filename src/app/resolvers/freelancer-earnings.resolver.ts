import { inject } from '@angular/core';
import { ResolveFn, Router } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { PaymentService } from '../services/payment.service';
import { ProjectService } from '../services/project.service';
import type { Payment } from '../models/payment.model';

export const freelancerEarningsResolver: ResolveFn<Payment[]> = () => {
  const router = inject(Router);
  const paymentService = inject(PaymentService);
  const projectService = inject(ProjectService);

  const rawToken = sessionStorage.getItem('authToken') || localStorage.getItem('authToken') || '';
  const token = rawToken.replace(/^"(.*)"$/, '$1').trim();
  if (!token) {
    router.navigate(['/login']);
    return of([]);
  }

  const fetchPayments = (freelancerId: string) =>
    paymentService.getPayments(freelancerId, 'freelancer').pipe(
      map((response) => (response?.payments || []) as Payment[]),
      catchError(() => of([]))
    );

  const userDataStr = sessionStorage.getItem('userData') || localStorage.getItem('userData');
  if (userDataStr) {
    try {
      const userData = JSON.parse(userDataStr);
      const freelancerId = userData?.id || userData?._id;
      if (freelancerId) {
        return fetchPayments(freelancerId);
      }
    } catch {
      // Fallback to auth/me below.
    }
  }

  return projectService.getCurrentUser().pipe(
    switchMap((response: any) => {
      const user = response?.user;
      const freelancerId = user?.id || user?._id;
      if (!freelancerId) {
        return of([]);
      }
      return fetchPayments(freelancerId);
    }),
    catchError(() => of([]))
  );
};
