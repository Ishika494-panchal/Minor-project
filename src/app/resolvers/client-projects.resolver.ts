import { inject } from '@angular/core';
import { ResolveFn, Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { BackendProject, ProjectService } from '../services/project.service';

export const clientProjectsResolver: ResolveFn<BackendProject[]> = () => {
  const projectService = inject(ProjectService);
  const router = inject(Router);

  return projectService.getMyClientProjects().pipe(
    catchError((error) => {
      if (String(error?.message || '').includes('401')) {
        router.navigate(['/login']);
      }
      return of([]);
    })
  );
};
