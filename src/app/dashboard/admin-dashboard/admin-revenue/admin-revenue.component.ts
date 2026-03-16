import { ChangeDetectorRef, Component, HostListener, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AdminService } from '../../../services/admin.service';

interface Transaction {
  id: string;
  clientName: string;
  freelancerName: string;
  projectTitle: string;
  amount: number;
  commission: number;
  paymentMethod: string;
  status: 'Pending' | 'Reviewing' | 'Completed' | 'Refunded' | 'Failed';
  date: string;
}

interface RevenueSummary {
  totalRevenue: number;
  revenueThisMonth: number;
  revenueThisWeek: number;
  platformCommission: number;
  pendingPayments: number;
}

@Component({
  selector: 'app-admin-revenue',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-revenue.component.html',
  styleUrls: ['./admin-revenue.component.css']
})
export class AdminRevenueComponent implements OnInit {
  userData: any = null;

  // Revenue Summary
  revenueSummary: RevenueSummary = {
    totalRevenue: 0,
    revenueThisMonth: 0,
    revenueThisWeek: 0,
    platformCommission: 0,
    pendingPayments: 0
  };

  // Monthly Revenue Data for Chart
  monthlyRevenue: { month: string; amount: number }[] = [];

  // Transactions
  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  recentTransactions: Transaction[] = [];

  // Filters
  searchTerm: string = '';
  statusFilter: string = 'All';
  methodFilter: string = 'All';
  dateFrom: string = '';
  dateTo: string = '';

  // Filter options
  statusOptions: string[] = ['All', 'Completed', 'Pending', 'Reviewing', 'Refunded', 'Failed'];
  methodOptions: string[] = ['All', 'Credit Card', 'Debit Card', 'UPI', 'Bank Transfer', 'PayPal'];
  activeActionPaymentIds = new Set<string>();
  isMobileOrTablet = false;
  isSidebarOpen = false;

  constructor(
    private router: Router,
    private adminService: AdminService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.updateViewportState();
    const userDataStr = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    if (userDataStr) {
      this.userData = JSON.parse(userDataStr);
      if (this.userData.role !== 'admin') {
        this.redirectBasedOnRole();
        return;
      }
      this.loadData();
    } else {
      this.router.navigate(['/login']);
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateViewportState();
  }

  private updateViewportState(): void {
    this.isMobileOrTablet = window.innerWidth <= 1024;
    if (!this.isMobileOrTablet) {
      this.isSidebarOpen = false;
    }
  }

  toggleSidebar(event?: Event): void {
    event?.stopPropagation();
    if (!this.isMobileOrTablet) return;
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar(): void {
    if (this.isMobileOrTablet) {
      this.isSidebarOpen = false;
    }
  }

  loadData(): void {
    this.adminService.getPayments().subscribe({
      next: (response) => {
        this.ngZone.run(() => {
          const payments = Array.isArray(response?.payments) ? response.payments : [];
          this.transactions = payments.map((payment: any) => ({
            id: String(payment.id),
            clientName: payment.clientName || 'Client',
            freelancerName: payment.freelancerName || 'Freelancer',
            projectTitle: payment.projectTitle || '',
            amount: Number(payment.amount || 0),
            commission: Number(payment.platformFee || 0),
            paymentMethod: payment.paymentMethod || 'Razorpay',
            status: (payment.status || 'Pending') as Transaction['status'],
            date: payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : ''
          }));

          this.refreshDerivedData();
          this.cdr.detectChanges();
        });
      },
      error: (error) => console.error('Failed to load payments', error)
    });
  }

  applyFilters(): void {
    this.filteredTransactions = this.transactions.filter(transaction => {
      // Search filter
      const matchesSearch = !this.searchTerm || 
        transaction.id.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        transaction.clientName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        transaction.freelancerName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        transaction.projectTitle.toLowerCase().includes(this.searchTerm.toLowerCase());

      // Status filter
      const matchesStatus = this.statusFilter === 'All' || transaction.status === this.statusFilter;

      // Method filter
      const matchesMethod = this.methodFilter === 'All' || transaction.paymentMethod === this.methodFilter;

      // Date range filter
      let matchesDate = true;
      if (this.dateFrom) {
        matchesDate = matchesDate && new Date(transaction.date) >= new Date(this.dateFrom);
      }
      if (this.dateTo) {
        matchesDate = matchesDate && new Date(transaction.date) <= new Date(this.dateTo);
      }

      return matchesSearch && matchesStatus && matchesMethod && matchesDate;
    });
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'All';
    this.methodFilter = 'All';
    this.dateFrom = '';
    this.dateTo = '';
    this.filteredTransactions = [...this.transactions];
  }

  exportToCSV(): void {
    const headers = [
      'Transaction ID',
      'Client Name',
      'Freelancer Name',
      'Project Title',
      'Payment Amount',
      'Platform Commission',
      'Payment Method',
      'Status',
      'Date'
    ];

    const csvData = this.filteredTransactions.map(t => [
      t.id,
      t.clientName,
      t.freelancerName,
      t.projectTitle,
      t.amount.toString(),
      t.commission.toString(),
      t.paymentMethod,
      t.status,
      t.date
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `revenue_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Completed': return 'completed';
      case 'Pending': return 'pending';
      case 'Reviewing': return 'pending';
      case 'Refunded': return 'refunded';
      case 'Failed': return 'refunded';
      default: return '';
    }
  }

  getChartHeight(amount: number): number {
    const maxAmount = Math.max(...this.monthlyRevenue.map(m => m.amount));
    return maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
  }

  formatCurrency(amount: number): string {
    return '₹' + amount.toLocaleString('en-IN');
  }

  redirectBasedOnRole(): void {
    if (this.userData.role === 'client') {
      this.router.navigate(['/client-dashboard']);
    } else if (this.userData.role === 'freelancer') {
      this.router.navigate(['/freelancer-dashboard']);
    } else {
      this.router.navigate(['/login']);
    }
  }

  logout(): void {
    this.closeSidebar();
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    this.router.navigate(['/login']);
  }

  markReviewing(transaction: Transaction): void {
    if (this.activeActionPaymentIds.has(transaction.id)) {
      return;
    }

    this.activeActionPaymentIds.add(transaction.id);
    const previousStatus = transaction.status;
    // Immediate first-click UI feedback.
    this.transactions = this.transactions.map((item) =>
      item.id === transaction.id ? { ...item, status: 'Reviewing' } : item
    );
    this.refreshDerivedData();
    this.cdr.detectChanges();

    this.adminService.reviewPayment(transaction.id, 'reviewing').subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.activeActionPaymentIds.delete(transaction.id);
          this.cdr.detectChanges();
          this.loadData();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
          this.transactions = this.transactions.map((item) =>
            item.id === transaction.id ? { ...item, status: previousStatus } : item
          );
          this.refreshDerivedData();
          this.activeActionPaymentIds.delete(transaction.id);
          this.cdr.detectChanges();
        });
        alert(error?.error?.message || 'Failed to mark payment as reviewing');
      }
    });
  }

  approvePayment(transaction: Transaction): void {
    if (this.activeActionPaymentIds.has(transaction.id)) {
      return;
    }

    this.activeActionPaymentIds.add(transaction.id);
    const previousStatus = transaction.status;
    // Immediate first-click UI feedback.
    this.transactions = this.transactions.map((item) =>
      item.id === transaction.id ? { ...item, status: 'Completed' } : item
    );
    this.refreshDerivedData();
    this.cdr.detectChanges();

    this.adminService.reviewPayment(transaction.id, 'approve').subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.activeActionPaymentIds.delete(transaction.id);
          this.cdr.detectChanges();
          this.loadData();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
          this.transactions = this.transactions.map((item) =>
            item.id === transaction.id ? { ...item, status: previousStatus } : item
          );
          this.refreshDerivedData();
          this.activeActionPaymentIds.delete(transaction.id);
          this.cdr.detectChanges();
        });
        alert(error?.error?.message || 'Failed to approve payment');
      }
    });
  }

  isActionInProgress(transactionId: string): boolean {
    return this.activeActionPaymentIds.has(transactionId);
  }

  private refreshDerivedData(): void {
    this.applyFilters();
    this.recentTransactions = [...this.transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
    this.revenueSummary = this.buildRevenueSummary(this.transactions);
    this.monthlyRevenue = this.buildMonthlyRevenue(this.transactions);
  }

  private buildRevenueSummary(transactions: Transaction[]): RevenueSummary {
    const completed = transactions.filter((item) => item.status === 'Completed');
    const pending = transactions.filter((item) => item.status === 'Pending' || item.status === 'Reviewing');
    const totalRevenue = completed.reduce((sum, item) => sum + item.amount, 0);
    const platformCommission = completed.reduce((sum, item) => sum + item.commission, 0);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const revenueThisMonth = completed
      .filter((item) => new Date(item.date) >= startOfMonth)
      .reduce((sum, item) => sum + item.amount, 0);

    const revenueThisWeek = completed
      .filter((item) => new Date(item.date) >= startOfWeek)
      .reduce((sum, item) => sum + item.amount, 0);

    return {
      totalRevenue,
      revenueThisMonth,
      revenueThisWeek,
      platformCommission,
      pendingPayments: pending.reduce((sum, item) => sum + item.amount, 0)
    };
  }

  private buildMonthlyRevenue(transactions: Transaction[]): { month: string; amount: number }[] {
    const monthly: Record<string, number> = {};
    transactions
      .filter((item) => item.status === 'Completed')
      .forEach((item) => {
        const date = new Date(item.date);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthly[key] = (monthly[key] || 0) + item.amount;
      });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return Object.keys(monthly)
      .sort()
      .map((key) => {
        const [year, month] = key.split('-');
        return { month: `${monthNames[Number(month) - 1]} ${year.slice(-2)}`, amount: monthly[key] };
      });
  }
}

