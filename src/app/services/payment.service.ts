import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Payment, PaymentSummary } from '../models/payment.model';
import { API_BASE_URL } from './api.config';

export interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  created_at: number;
}

export interface PaymentResponse {
  success: boolean;
  message?: string;
  order?: RazorpayOrder;
  paymentId?: string;
  keyId?: string;
  payment?: any;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = `${API_BASE_URL}/api`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const rawToken = sessionStorage.getItem('authToken') || localStorage.getItem('authToken') || '';
    const token = rawToken.replace(/^"(.*)"$/, '$1').trim();
    return new HttpHeaders({
      ...(token && { Authorization: `Bearer ${token}` })
    });
  }

  /**
   * Get Razorpay key
   */
  getRazorpayKey(): Observable<{ success: boolean; keyId: string }> {
    return this.http.get<{ success: boolean; keyId: string }>(`${this.apiUrl}/payments/key`);
  }

  /**
   * Create Razorpay order
   */
  createRazorpayOrder(projectId: string, amount: number): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>(`${this.apiUrl}/payments/create-order`, {
      projectId,
      amount
    }, { headers: this.getAuthHeaders() });
  }

  /**
   * Verify payment
   */
  verifyPayment(
    razorpay_payment_id: string,
    razorpay_order_id: string,
    razorpay_signature: string,
    projectId: string,
    paymentId: string
  ): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>(`${this.apiUrl}/payments/verify`, {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      projectId,
      paymentId
    }, { headers: this.getAuthHeaders() });
  }

  /**
   * Get all payments
   */
getPayments(userId?: string, role?: string): Observable<{ success: boolean; payments: Payment[] }> {
    let queryParams = '';
    if (userId && role) {
      queryParams = `?userId=${userId}&role=${role}`;
    }
    return this.http.get<{ success: boolean; payments: Payment[] }>(`${this.apiUrl}/payments${queryParams}`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Get payment by ID
   */
  getPaymentById(paymentId: string): Observable<{ success: boolean; payment: Payment }> {
    return this.http.get<{ success: boolean; payment: Payment }>(`${this.apiUrl}/payments/${paymentId}`, {
      headers: this.getAuthHeaders()
    });  
  }

  /**
   * Get payment summary for user
   */
  getPaymentSummary(userId: string, role: string): Observable<{ success: boolean; summary: PaymentSummary }> {
    return this.http.get<{ success: boolean; summary: PaymentSummary }>(`${this.apiUrl}/payments/summary/${userId}?role=${role}`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Get completed jobs count for logged-in freelancer
   */
  getMyCompletedJobsCount(): Observable<{ success: boolean; completedJobsCount: number }> {
    return this.http.get<{ success: boolean; completedJobsCount: number }>(`${this.apiUrl}/payments/completed-jobs/me`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Update payment status
   */
  updatePaymentStatus(paymentId: string, status: string): Observable<{ success: boolean; payment: Payment }> {
    return this.http.put<{ success: boolean; payment: Payment }>(`${this.apiUrl}/payments/${paymentId}/status`, { status }, {
      headers: this.getAuthHeaders()
    });
  }
}

