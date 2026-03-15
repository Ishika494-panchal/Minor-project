import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface BackendProject {
  _id: string;
  title: string;
  description: string;
  category: string;
  skills: string[];
  budget: number;
  deadline: string;
  experienceLevel: string;
  projectType: string;
  attachments: string[];
  allowProposals: boolean;
  clientId: string;
  clientName: string;
  status: string;
  createdAt: string;
  assignedFreelancerId?: string;
  assignedFreelancerName?: string;
  submissionCodeFileName?: string;
  submissionCodeFilePath?: string;
  submissionHostedLink?: string;
  clientApprovedForPayment?: boolean;
  clientApprovedAt?: string | null;
  resubmissionReason?: string;
  resubmissionRequestedAt?: string | null;
}

export interface BackendProposal {
  _id: string;
  projectId: string;
  projectTitle: string;
  clientId?: string;
  clientName?: string;
  freelancerId: string;
  freelancerName: string;
  freelancerProfilePicture: string;
  rating: number;
  proposedBudget: number;
  deliveryTime: number;
  proposalMessage: string;
  portfolioLink: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface BackendFreelancerProfile {
  id: string;
  fullName: string;
  email: string;
  bio: string;
  skills: string[];
  hourlyRate: number;
  earnings: number;
  memberSince: string;
  profileImage: string;
  rating: number;
  portfolioLink: string;
  deliveryTime: number;
  proposedBudget: number;
  acceptedProposals: number;
  totalProposals: number;
}

export interface ApiResponse<T> {
  success: boolean;
  project?: T;
  proposal?: BackendProposal;
  projects?: T[];
  proposals?: BackendProposal[];
  message?: string;
  freelancerProfile?: BackendFreelancerProfile;
  user?: {
    id: string;
    fullName: string;
    email: string;
    role: 'freelancer' | 'client' | 'admin';
  };
}

export interface CreateProjectInput {
  title: string;
  description: string;
  category: string;
  skills: string[];
  budget: number;
  deadline: string;
  experienceLevel: string;
  projectType: string;
  attachments: string[];
  allowProposals: boolean;
}

export interface ReviewSubmissionPayload {
  action: 'approve' | 'resubmit';
  reason?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private apiUrl = 'http://localhost:3000/api/projects';
  private proposalsUrl = 'http://localhost:3000/api/proposals';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const rawToken = sessionStorage.getItem('authToken') || localStorage.getItem('authToken') || '';
    const token = rawToken.replace(/^"(.*)"$/, '$1').trim();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    });
  }

  createProject(projectData: CreateProjectInput): Observable<ApiResponse<BackendProject>> {
    return this.http.post<ApiResponse<BackendProject>>(`${this.apiUrl}`, projectData, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  getClientProjects(clientId: string): Observable<BackendProject[]> {
    return this.http.get<{ projects: BackendProject[] }>(`${this.apiUrl}/client/${clientId}`, { headers: this.getAuthHeaders() }).pipe(
      map((response) => response.projects || []),
      catchError(this.handleError)
    );
  }

  getMyClientProjects(): Observable<BackendProject[]> {
    return this.http.get<{ projects: BackendProject[] }>(`${this.apiUrl}/my`, { headers: this.getAuthHeaders() }).pipe(
      map((response) => response.projects || []),
      catchError(this.handleError)
    );
  }

  getCurrentUser(): Observable<ApiResponse<unknown>> {
    return this.http.get<ApiResponse<unknown>>('http://localhost:3000/api/auth/me', { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  getFreelancerProjects(freelancerId: string): Observable<BackendProject[]> {
    return this.http.get<{ projects: BackendProject[] }>(`${this.apiUrl}/freelancer/${freelancerId}`, { headers: this.getAuthHeaders() }).pipe(
      map((response) => response.projects || []),
      catchError(this.handleError)
    );
  }

  getOpenProjects(): Observable<BackendProject[]> {
    return this.http.get<{ projects: BackendProject[] }>(`${this.apiUrl}/open`, { headers: this.getAuthHeaders() }).pipe(
      map((response) => response.projects || []),
      catchError(this.handleError)
    );
  }

  getFreelancerProposals(freelancerId: string): Observable<BackendProposal[]> {
    return this.http.get<{ proposals: BackendProposal[] }>(`${this.proposalsUrl}/freelancer/${freelancerId}`, { headers: this.getAuthHeaders() }).pipe(
      map((response) => response.proposals || []),
      catchError(this.handleError)
    );
  }

  getProposalsByProject(projectId: string): Observable<BackendProposal[]> {
    return this.http.get<{ proposals: BackendProposal[] }>(`${this.proposalsUrl}/project/${projectId}`, { headers: this.getAuthHeaders() }).pipe(
      map((response) => response.proposals || []),
      catchError(this.handleError)
    );
  }

  getClientProposals(clientId: string): Observable<BackendProposal[]> {
    return this.http.get<{ proposals: BackendProposal[] }>(`${this.proposalsUrl}/client/${clientId}`, { headers: this.getAuthHeaders() }).pipe(
      map((response) => response.proposals || []),
      catchError(this.handleError)
    );
  }

  getFreelancerProfile(freelancerId: string): Observable<BackendFreelancerProfile> {
    return this.http
      .get<ApiResponse<unknown>>(`${this.proposalsUrl}/freelancer-profile/${freelancerId}`, { headers: this.getAuthHeaders() })
      .pipe(
        map((response) => response.freelancerProfile as BackendFreelancerProfile),
        catchError(this.handleError)
      );
  }

  createProposal(proposalData: {
    projectId: string;
    projectTitle: string;
    proposedBudget: number;
    deliveryTime: number;
    proposalMessage: string;
    portfolioLink?: string;
  }): Observable<ApiResponse<BackendProposal>> {
    return this.http.post<ApiResponse<BackendProposal>>(`${this.proposalsUrl}`, proposalData, { headers: this.getAuthHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  updateProposalStatus(proposalId: string, status: 'accepted' | 'rejected'): Observable<ApiResponse<BackendProposal>> {
    return this.http.put<ApiResponse<BackendProposal>>(
      `${this.proposalsUrl}/${proposalId}/status`,
      { status },
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  submitProjectWork(projectId: string): Observable<ApiResponse<BackendProject>> {
    return this.http.put<ApiResponse<BackendProject>>(
      `${this.apiUrl}/${projectId}/submit`,
      {},
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  uploadProjectSubmission(projectId: string, payload: { hostedLink?: string; codeZip?: File }): Observable<ApiResponse<BackendProject>> {
    const formData = new FormData();
    if (payload.hostedLink) {
      formData.append('hostedLink', payload.hostedLink);
    }
    if (payload.codeZip) {
      formData.append('codeZip', payload.codeZip);
    }

    const rawToken = sessionStorage.getItem('authToken') || localStorage.getItem('authToken') || '';
    const token = rawToken.replace(/^"(.*)"$/, '$1').trim();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();

    return this.http.post<ApiResponse<BackendProject>>(`${this.apiUrl}/${projectId}/submission`, formData, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  reviewSubmittedProject(projectId: string, payload: ReviewSubmissionPayload): Observable<ApiResponse<BackendProject>> {
    return this.http.put<ApiResponse<BackendProject>>(
      `${this.apiUrl}/${projectId}/review-submission`,
      payload,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('ProjectService Error:', error);
    let errorMessage = 'An unknown error occurred';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      if (error.status === 401) {
        // Clear stale auth so app can prompt for fresh login.
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('userData');
      }
      errorMessage = `Server Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    return throwError(() => new Error(errorMessage));
  }
}

