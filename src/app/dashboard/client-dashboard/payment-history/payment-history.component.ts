import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { PaymentService } from '../../../services/payment.service';

interface UiPayment {
  id: string;
  projectTitle: string;
  freelancerName: string;
  amount: number;
  paymentMethod: string;
  date: Date;
  status: 'Pending' | 'Completed' | 'Failed' | 'Refunded';
}

@Component({
  selector: 'app-payment-history',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './payment-history.component.html',
  styleUrls: ['./payment-history.component.css']
})
export class PaymentHistoryComponent implements OnInit {
  userData: any = null;
  payments: UiPayment[] = [];
  totalAmount: number = 0;

  // Notification dropdown
  showNotifications = false;
  notificationsList: any[] = [];

  // Profile dropdown
  showProfileMenu = false;

  constructor(
    private router: Router,
    private paymentService: PaymentService
  ) {}

  ngOnInit(): void {
    const userDataStr = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    if (userDataStr) {
      this.userData = JSON.parse(userDataStr);
      this.loadPaymentHistory();
    } else {
      this.router.navigate(['/login']);
    }
  }

  loadPaymentHistory(): void {
    const clientId = this.userData?.id || this.userData?._id;
    if (!clientId) {
      this.payments = [];
      this.totalAmount = 0;
      return;
    }

    this.paymentService.getPayments(clientId, 'client').subscribe({
      next: (response) => {
        const apiPayments = (response?.payments || [])
          .filter((payment: any) => String(payment?.status) === 'Completed');

        this.payments = apiPayments.map((payment: any) => ({
          id: String(payment._id || payment.id || ''),
          projectTitle: payment.projectTitle || payment?.projectId?.title || 'Project',
          freelancerName: payment.freelancerName || payment?.freelancerId?.fullName || 'Freelancer',
          amount: Number(payment.amount || 0),
          paymentMethod: payment.paymentMethod || 'Razorpay',
          date: new Date(payment.paymentDate || payment.createdAt || Date.now()),
          status: payment.status || 'Completed'
        }));

        this.totalAmount = this.payments.reduce((sum, p) => sum + p.amount, 0);
      },
      error: () => {
        this.payments = [];
        this.totalAmount = 0;
      }
    });
  }

  // Toggle notification dropdown
  toggleNotifications(event: Event): void {
    event.stopPropagation();
    this.showNotifications = !this.showNotifications;
    this.showProfileMenu = false;
  }

  // Toggle profile dropdown
  toggleProfileMenu(event: Event): void {
    event.stopPropagation();
    this.showProfileMenu = !this.showProfileMenu;
    this.showNotifications = false;
  }

  // Close dropdowns when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-wrapper') && !target.closest('.profile-wrapper')) {
      this.showNotifications = false;
      this.showProfileMenu = false;
    }
  }

  // Mark all notifications as read
  markAllAsRead(): void {
    this.notificationsList.forEach((n: any) => n.read = true);
  }

  // Navigate to profile
  goToProfile(): void {
    this.router.navigate(['/client-profile']);
    this.showProfileMenu = false;
  }

  // Navigate to settings
  goToSettings(): void {
    this.router.navigate(['/client-settings']);
    this.showProfileMenu = false;
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    this.router.navigate(['/login']);
  }
}

