import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { API_BASE_URL } from './api.config';

export interface BackendGig {
  _id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  portfolioLink?: string;
  price: number;
  deliveryDays: number;
  images: string[];
  status: 'Active' | 'Paused' | 'Draft' | 'Deleted';
  freelancerId: string;
  freelancerName: string;
  createdAt: string;
  updatedAt: string;
}

interface GigResponse {
  success: boolean;
  message?: string;
  gig?: BackendGig;
  gigs?: BackendGig[];
}

export interface SaveGigPayload {
  title: string;
  description: string;
  category: string;
  tags: string[];
  portfolioLink?: string;
  price: number;
  deliveryDays: number;
  images: string[];
  status?: 'Active' | 'Paused' | 'Draft';
}

@Injectable({
  providedIn: 'root'
})
export class GigService {
  private gigsApiUrl = `${API_BASE_URL}/api/gigs`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const rawToken = sessionStorage.getItem('authToken') || localStorage.getItem('authToken') || '';
    const token = rawToken.replace(/^"(.*)"$/, '$1').trim();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    });
  }

  createGig(payload: SaveGigPayload): Observable<BackendGig> {
    return this.http
      .post<GigResponse>(this.gigsApiUrl, payload, { headers: this.getAuthHeaders() })
      .pipe(
        map((response) => response.gig as BackendGig),
        catchError(this.handleError)
      );
  }

  getMyGigs(): Observable<BackendGig[]> {
    return this.http
      .get<GigResponse>(`${this.gigsApiUrl}/my`, { headers: this.getAuthHeaders() })
      .pipe(
        timeout(10000),
        map((response) => response.gigs || []),
        catchError(this.handleError)
      );
  }

  getDiscoverGigs(): Observable<BackendGig[]> {
    return this.http
      .get<GigResponse>(`${this.gigsApiUrl}/discover`, { headers: this.getAuthHeaders() })
      .pipe(
        timeout(10000),
        map((response) => response.gigs || []),
        catchError(this.handleError)
      );
  }

  getGigById(gigId: string): Observable<BackendGig> {
    return this.http
      .get<GigResponse>(`${this.gigsApiUrl}/${gigId}`, { headers: this.getAuthHeaders() })
      .pipe(
        map((response) => response.gig as BackendGig),
        catchError(this.handleError)
      );
  }

  updateGig(gigId: string, payload: SaveGigPayload): Observable<BackendGig> {
    return this.http
      .put<GigResponse>(`${this.gigsApiUrl}/${gigId}`, payload, { headers: this.getAuthHeaders() })
      .pipe(
        map((response) => response.gig as BackendGig),
        catchError(this.handleError)
      );
  }

  deleteGig(gigId: string): Observable<void> {
    return this.http
      .delete<GigResponse>(`${this.gigsApiUrl}/${gigId}`, { headers: this.getAuthHeaders() })
      .pipe(
        map(() => undefined),
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('GigService Error:', error);
    let errorMessage = 'Something went wrong';
    if (error.error?.message) {
      errorMessage = error.error.message;
    }
    return throwError(() => new Error(errorMessage));
  }
}
