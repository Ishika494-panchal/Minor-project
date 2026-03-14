import { inject } from '@angular/core';
import { ResolveFn, Router } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { BackendProject, BackendProposal, ProjectService } from '../services/project.service';

export interface FreelancerFindJobsResolvedData {
  projects: BackendProject[];
  proposals: BackendProposal[];
}

export const freelancerFindJobsResolver: ResolveFn<FreelancerFindJobsResolvedData> = () => {
  const projectService = inject(ProjectService);
  const router = inject(Router);

  const userDataStr = sessionStorage.getItem('userData') || localStorage.getItem('userData');
  if (!userDataStr) {
    router.navigate(['/login']);
    return of({ projects: [], proposals: [] });
  }

  try {
    const userData = JSON.parse(userDataStr);
    const freelancerId = userData?.id || userData?._id;
    if (!freelancerId) {
      return of({ projects: [], proposals: [] });
    }

    return forkJoin({
      projects: projectService.getOpenProjects(),
      proposals: projectService.getFreelancerProposals(freelancerId)
    }).pipe(
      map((data) => ({
        projects: data.projects || [],
        proposals: data.proposals || []
      })),
      catchError((error) => {
        if (String(error?.message || '').includes('401')) {
          router.navigate(['/login']);
        }
        return of({ projects: [], proposals: [] });
      })
    );
  } catch {
    return of({ projects: [], proposals: [] });
  }
};
