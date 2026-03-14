import { inject } from '@angular/core';
import { ResolveFn, Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { BackendProposal, ProjectService } from '../services/project.service';

export const freelancerProposalsResolver: ResolveFn<BackendProposal[]> = () => {
  const projectService = inject(ProjectService);
  const router = inject(Router);

  const userDataStr = sessionStorage.getItem('userData') || localStorage.getItem('userData');
  if (!userDataStr) {
    router.navigate(['/login']);
    return of([]);
  }

  try {
    const userData = JSON.parse(userDataStr);
    const freelancerId = userData?.id || userData?._id;
    if (!freelancerId) {
      return of([]);
    }

    return projectService.getFreelancerProposals(freelancerId).pipe(
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
