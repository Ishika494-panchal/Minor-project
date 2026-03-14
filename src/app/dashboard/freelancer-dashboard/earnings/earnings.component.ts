import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentService } from '../../../services/payment.service';
import { ProjectService } from '../../../services/project.service';
import type { Payment } from '../../../models/payment.model';

interface EarningsSummary {
  title: string;
  value: string | number;
  icon: string;
  color: string;
}

interface MonthlyEarnings {
  month: string;
  amount: number;
}

interface PaymentRecord {
  projectName: string;
  clientName: string;
  amount: number;
  date: string;
  status: 'Paid' | 'Pending' | 'Processing' | 'Failed';
}

interface NotificationItem {
  id: number;
  type: string;
  message: string;
  time: string;
  read: boolean;
}

@Component({
  selector: 'app-earnings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './earnings.component.html',
  styleUrls: ['./earnings.component.css']
})
export class EarningsComponent implements OnInit {
  // Navbar
  showNotifications = false;
  showProfileMenu = false;
  searchQuery = '';
  userData: any = null;

  // Notifications
  notificationsList: NotificationItem[] = [
    {
      id: 1,
      type: 'job',
      message: 'New job matching your skills: React Developer',
      time: '2 hours ago',
      read: false
    },
    {
      id: 2,
      type: 'message',
      message: 'You have a new message from Tech Solutions Inc.',
      time: '5 hours ago',
      read: false
    },
    {
      id: 3,
      type: 'payment',
      message: 'Payment received: ₹15,000',
      time: '1 day ago',
      read: true
    }
  ];

  // Summary cards start at 0 until real payment data arrives.
  earningsSummary: EarningsSummary[] = this.buildZeroSummary();

  // Monthly earnings start at 0 and update from completed payments.
  monthlyEarnings: MonthlyEarnings[] = this.buildZeroMonthlyEarnings();

  maxEarnings = 1;

  // Payment history starts empty and is filled from backend.
  paymentHistory: PaymentRecord[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private paymentService: PaymentService,
    private projectService: ProjectService
  ) {}

  ngOnInit(): void {
    const rawToken = sessionStorage.getItem('authToken') || localStorage.getItem('authToken') || '';
    const token = rawToken.replace(/^"(.*)"$/, '$1').trim();
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    // Load user data
    const userDataStr = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    if (userDataStr) {
      this.userData = JSON.parse(userDataStr);
    }

    const resolvedPayments = (this.route.snapshot.data['earningsPayments'] || []) as Payment[];
    this.applyPaymentData(resolvedPayments);

    // Background refresh to ensure latest user + latest payment records.
    this.syncCurrentUserAndRefreshPayments();
  }

  getBarHeight(amount: number): number {
    if (!this.maxEarnings) {
      return 0;
    }
    return (amount / this.maxEarnings) * 100;
  }

  getStatusClass(status: string): string {
    return status.toLowerCase();
  }

  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      'Paid': 'fas fa-check-circle',
      'Pending': 'fas fa-clock',
      'Processing': 'fas fa-spinner',
      'Failed': 'fas fa-times-circle'
    };
    return icons[status] || 'fas fa-circle';
  }

  private loadEarningsFromPayments(): void {
    const freelancerId = this.userData?.id || this.userData?._id;
    if (!freelancerId) {
      this.resetEarningsToZero();
      return;
    }

    this.paymentService.getPayments(freelancerId, 'freelancer').subscribe({
      next: (response) => {
        const payments = (response?.payments || []) as Payment[];
        this.applyPaymentData(payments);
      },
      error: () => {
        this.resetEarningsToZero();
      }
    });
  }

  private syncCurrentUserAndRefreshPayments(): void {
    this.projectService.getCurrentUser().subscribe({
      next: (response: any) => {
        const currentUser = response?.user;
        if (!currentUser || String(currentUser.role || '').toLowerCase() !== 'freelancer') {
          return;
        }
        this.userData = currentUser;
        sessionStorage.setItem('userData', JSON.stringify(currentUser));
        localStorage.setItem('userData', JSON.stringify(currentUser));
        this.loadEarningsFromPayments();
      },
      error: () => {
        // Keep resolver data as fallback.
      }
    });
  }

  private applyPaymentData(payments: Payment[]): void {
    const completed = payments.filter((p: any) => p.status === 'Completed');
    const pending = payments.filter((p: any) => p.status === 'Pending');

    const totalEarningsValue = completed.reduce((sum: number, p: any) => {
      const platformFee = Number(p.platformFee || 0);
      return sum + (Number(p.amount || 0) - platformFee);
    }, 0);

    const thisMonthEarningsValue = completed.reduce((sum: number, p: any) => {
      const paymentDate = new Date(p.paymentDate || p.createdAt || p.date || Date.now());
      const now = new Date();
      const sameMonth = paymentDate.getMonth() === now.getMonth() && paymentDate.getFullYear() === now.getFullYear();
      if (!sameMonth) {
        return sum;
      }
      const platformFee = Number(p.platformFee || 0);
      return sum + (Number(p.amount || 0) - platformFee);
    }, 0);

    const pendingAmountValue = pending.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

    this.earningsSummary = [
      { title: 'Total Earnings', value: `₹${totalEarningsValue.toLocaleString('en-IN')}`, icon: 'fas fa-wallet', color: 'green' },
      { title: 'This Month', value: `₹${thisMonthEarningsValue.toLocaleString('en-IN')}`, icon: 'fas fa-calendar-alt', color: 'blue' },
      { title: 'Pending Payments', value: `₹${pendingAmountValue.toLocaleString('en-IN')}`, icon: 'fas fa-clock', color: 'orange' },
      { title: 'Completed Projects', value: completed.length, icon: 'fas fa-check-circle', color: 'purple' }
    ];

    this.monthlyEarnings = this.buildMonthlyEarningsFromPayments(completed);
    this.maxEarnings = Math.max(1, ...this.monthlyEarnings.map((m) => m.amount));

    const sortedPayments = [...payments].sort((a: any, b: any) => {
      const bDate = new Date(b.paymentDate || b.createdAt || b.date || 0).getTime();
      const aDate = new Date(a.paymentDate || a.createdAt || a.date || 0).getTime();
      return bDate - aDate;
    });

    this.paymentHistory = sortedPayments
      .map((p: any) => ({
        projectName: p.projectTitle || p.projectName || 'Project',
        clientName: p.clientName || p.clientId?.fullName || 'Client',
        amount: Number(p.amount || 0),
        date: this.formatPaymentDate(p.paymentDate || p.createdAt || p.date),
        status: this.mapPaymentStatus(p.status)
      }));
  }

  private mapPaymentStatus(status: string): PaymentRecord['status'] {
    if (status === 'Completed') {
      return 'Paid';
    }
    if (status === 'Pending') {
      return 'Pending';
    }
    if (status === 'Failed') {
      return 'Failed';
    }
    return 'Processing';
  }

  private formatPaymentDate(value: string | Date | undefined): string {
    const date = value ? new Date(value) : new Date();
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private buildMonthlyEarningsFromPayments(completedPayments: Payment[]): MonthlyEarnings[] {
    const now = new Date();
    const buckets: MonthlyEarnings[] = [];

    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        month: d.toLocaleDateString('en-US', { month: 'short' }),
        amount: 0
      });
    }

    completedPayments.forEach((payment: any) => {
      const date = new Date(payment.paymentDate || payment.createdAt || payment.date || Date.now());
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
      const idx = buckets.findIndex((b) => b.month === monthKey);
      if (idx !== -1) {
        const fee = Number(payment.platformFee || 0);
        buckets[idx].amount += Math.max(0, Number(payment.amount || 0) - fee);
      }
    });

    return buckets;
  }

  private buildZeroSummary(): EarningsSummary[] {
    return [
      { title: 'Total Earnings', value: '₹0', icon: 'fas fa-wallet', color: 'green' },
      { title: 'This Month', value: '₹0', icon: 'fas fa-calendar-alt', color: 'blue' },
      { title: 'Pending Payments', value: '₹0', icon: 'fas fa-clock', color: 'orange' },
      { title: 'Completed Projects', value: 0, icon: 'fas fa-check-circle', color: 'purple' }
    ];
  }

  private buildZeroMonthlyEarnings(): MonthlyEarnings[] {
    const now = new Date();
    const months: MonthlyEarnings[] = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: d.toLocaleDateString('en-US', { month: 'short' }),
        amount: 0
      });
    }
    return months;
  }

  private resetEarningsToZero(): void {
    this.earningsSummary = this.buildZeroSummary();
    this.monthlyEarnings = this.buildZeroMonthlyEarnings();
    this.maxEarnings = 1;
    this.paymentHistory = [];
  }

  // Navbar methods
  toggleNotifications(event: Event): void {
    event.stopPropagation();
    this.showNotifications = !this.showNotifications;
    this.showProfileMenu = false;
  }

  toggleProfileMenu(event: Event): void {
    event.stopPropagation();
    this.showProfileMenu = !this.showProfileMenu;
    this.showNotifications = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-wrapper') && !target.closest('.profile-wrapper')) {
      this.showNotifications = false;
      this.showProfileMenu = false;
    }
  }

  search(): void {
    console.log('Searching:', this.searchQuery);
  }

  getNotificationIcon(type: string): string {
    const icons: { [key: string]: string } = {
      job: 'fas fa-briefcase',
      payment: 'fas fa-dollar-sign',
      message: 'fas fa-envelope',
      project: 'fas fa-folder-open',
      review: 'fas fa-star'
    };
    return icons[type] || 'fas fa-bell';
  }

  get unreadCount(): number {
    return this.notificationsList.filter(n => !n.read).length;
  }

  markAllAsRead(): void {
    this.notificationsList.forEach(n => n.read = true);
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    this.router.navigate(['/login']);
  }

  goToProfile(): void {
    this.showProfileMenu = false;
  }

  goToSettings(): void {
    this.showProfileMenu = false;
  }

  goToDashboard(): void {
    this.router.navigate(['/freelancer-dashboard']);
  }

  goToFindJobs(): void {
    this.router.navigate(['/find-jobs']);
  }

  goToMyGigs(): void {
    this.router.navigate(['/my-gigs']);
  }

  goToMessages(): void {
    this.router.navigate(['/freelancer-messages']);
  }

  goToProjects(): void {
    this.router.navigate(['/my-projects']);
  }
}

