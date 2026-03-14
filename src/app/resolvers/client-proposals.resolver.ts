import { inject } from '@angular/core';
import { ResolveFn, Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { BackendProposal, ProjectService } from '../services/project.service';

export const clientProposalsResolver: ResolveFn<BackendProposal[]> = () => {
  const projectService = inject(ProjectService);
  const router = inject(Router);

  const userDataStr = sessionStorage.getItem('userData') || localStorage.getItem('userData');
  if (!userDataStr) {
    router.navigate(['/login']);
    return of([]);
  }

  try {
    const userData = JSON.parse(userDataStr);
    const clientId = userData?.id || userData?._id;
    if (!clientId) {
      return of([]);
    }

    return projectService.getClientProposals(clientId).pipe(
      catchError((error) => {
        if (String(error?.message || '').includes('401')) {
          router.navigate(['/login']);
        }
        return of([]);
      })
    );
  } catch {
    return of([]);
  }
};
