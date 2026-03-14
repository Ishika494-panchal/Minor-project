import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { PaymentService } from '../../../services/payment.service';

interface UiPayment {
  id: string;
  projectId?: string;
  projectTitle: string;
  freelancerName: string;
  amount: number;
  paymentMethod: string;
  date: Date;
  status: 'Pending' | 'Completed' | 'Failed' | 'Refunded';
}

interface UiSummary {
  totalSpent: number;
  pendingPayments: number;
  completedPayments: number;
}

@Component({
  selector: 'app-client-payments',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './client-payments.component.html',
  styleUrls: ['./client-payments.component.css']
})
export class ClientPaymentsComponent implements OnInit {
  userData: any = null;
  payments: UiPayment[] = [];
  summary: UiSummary = {
    totalSpent: 0,
    pendingPayments: 0,
    completedPayments: 0
  };
  processingPayment: string | null = null;

  constructor(
    private router: Router,
    private paymentService: PaymentService
  ) {}

  ngOnInit(): void {
    const userDataStr = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    if (userDataStr) {
      this.userData = JSON.parse(userDataStr);
      this.loadPayments();
    } else {
      this.router.navigate(['/login']);
    }
  }

  loadPayments(): void {
    const clientId = this.userData?.id || this.userData?._id;
    if (!clientId) {
      this.payments = [];
      this.summary = { totalSpent: 0, pendingPayments: 0, completedPayments: 0 };
      return;
    }

    this.paymentService.getPayments(clientId, 'client').subscribe({
      next: (response) => {
        const apiPayments = response?.payments || [];
        this.payments = apiPayments.map((payment: any) => ({
          id: String(payment._id || payment.id || ''),
          projectId: String(payment?.projectId?._id || payment?.projectId || ''),
          projectTitle: payment.projectTitle || payment?.projectId?.title || 'Project',
          freelancerName: payment.freelancerName || payment?.freelancerId?.fullName || 'Freelancer',
          amount: Number(payment.amount || 0),
          paymentMethod: payment.paymentMethod || 'Razorpay',
          date: new Date(payment.paymentDate || payment.createdAt || Date.now()),
          status: payment.status || 'Pending'
        }));

        this.summary = {
          totalSpent: this.payments
            .filter((p) => p.status === 'Completed')
            .reduce((sum, p) => sum + p.amount, 0),
          pendingPayments: this.payments.filter((p) => p.status === 'Pending').length,
          completedPayments: this.payments.filter((p) => p.status === 'Completed').length
        };
      },
      error: () => {
        this.payments = [];
        this.summary = { totalSpent: 0, pendingPayments: 0, completedPayments: 0 };
      }
    });
  }

  payNow(payment: UiPayment): void {
    this.router.navigate(['/projects']);
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    this.router.navigate(['/login']);
  }

  getPendingPayments(): UiPayment[] {
    return this.payments.filter(p => p.status === 'Pending');
  }

  getCompletedPayments(): UiPayment[] {
    return this.payments.filter(p => p.status === 'Completed');
  }
}

