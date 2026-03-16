import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly baseUrl = `${API_BASE_URL}/api/admin`;

  constructor(private http: HttpClient) {}

  getOverview(): Observable<any> {
    return this.http.get(`${this.baseUrl}/overview`, { headers: this.getAuthHeaders() });
  }

  getActivities(limit = 20): Observable<any> {
    return this.http.get(`${this.baseUrl}/activities?limit=${limit}`, { headers: this.getAuthHeaders() });
  }

  getUsers(role = '', search = ''): Observable<any> {
    const params = new URLSearchParams();
    if (role) params.set('role', role);
    if (search) params.set('search', search);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return this.http.get(`${this.baseUrl}/users${suffix}`, { headers: this.getAuthHeaders() });
  }

  updateUserStatus(userId: string, status: 'Active' | 'Blocked'): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/users/${userId}/status`,
      { status },
      { headers: this.getAuthHeaders() }
    );
  }

  deleteUser(userId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/users/${userId}`, { headers: this.getAuthHeaders() });
  }

  updateUserProfileByAdmin(userId: string, payload: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/users/${userId}/profile`, payload, {
      headers: this.getAuthHeaders()
    });
  }

  getServices(status = ''): Observable<any> {
    const suffix = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.http.get(`${this.baseUrl}/services${suffix}`, { headers: this.getAuthHeaders() });
  }

  updateServiceStatus(serviceId: string, status: 'Active' | 'Paused' | 'Draft' | 'Deleted'): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/services/${serviceId}/status`,
      { status },
      { headers: this.getAuthHeaders() }
    );
  }

  updateService(serviceId: string, payload: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/services/${serviceId}`, payload, { headers: this.getAuthHeaders() });
  }

  getOrders(): Observable<any> {
    return this.http.get(`${this.baseUrl}/orders`, { headers: this.getAuthHeaders() });
  }

  getPayments(): Observable<any> {
    return this.http.get(`${this.baseUrl}/payments`, { headers: this.getAuthHeaders() });
  }

  reviewPayment(paymentId: string, action: 'reviewing' | 'approve'): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/payments/${paymentId}/review`,
      { action },
      { headers: this.getAuthHeaders() }
    );
  }

  private getAuthHeaders(): HttpHeaders {
    const rawToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
    const token = rawToken.replace(/^"(.*)"$/, '$1').trim();
    return new HttpHeaders({
      ...(token && { Authorization: `Bearer ${token}` })
    });
  }
}
