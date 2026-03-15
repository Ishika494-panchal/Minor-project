import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';

export interface NotificationActor {
  id: string;
  fullName: string;
  email: string;
  profileImage?: string;
}

export interface NotificationItem {
  id: string;
  recipientId: string;
  actor: NotificationActor | null;
  type:
    | 'chat_message'
    | 'order_created'
    | 'order_accepted'
    | 'order_cancelled'
    | 'delivery_submitted'
    | 'revision_requested'
    | 'project_approved'
    | 'payment_success'
    | 'payout_sent'
    | 'dispute_opened'
    | 'system_alert';
  title: string;
  message: string;
  linkedEntityType: 'message' | 'conversation' | 'project' | 'payment' | 'proposal' | 'dispute' | 'system';
  linkedEntityId: string;
  actionUrl: string;
  metadata?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly baseUrl = `${API_BASE_URL}/api/notifications`;

  constructor(private http: HttpClient) {}

  getMyNotifications(limit = 30, page = 1, type = ''): Observable<any> {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    params.set('page', String(page));
    if (type) params.set('type', type);
    return this.http.get(`${this.baseUrl}?${params.toString()}`, { headers: this.getAuthHeaders() });
  }

  getUnreadCount(): Observable<any> {
    return this.http.get(`${this.baseUrl}/unread-count`, { headers: this.getAuthHeaders() });
  }

  markAsRead(notificationId: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/${notificationId}/read`, {}, { headers: this.getAuthHeaders() });
  }

  archiveNotification(notificationId: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/${notificationId}/archive`, {}, { headers: this.getAuthHeaders() });
  }

  markAllAsRead(): Observable<any> {
    return this.http.put(`${this.baseUrl}/read-all`, {}, { headers: this.getAuthHeaders() });
  }

  private getAuthHeaders(): HttpHeaders {
    const rawToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
    const token = rawToken.replace(/^"(.*)"$/, '$1').trim();
    return new HttpHeaders({
      ...(token && { Authorization: `Bearer ${token}` })
    });
  }
}
