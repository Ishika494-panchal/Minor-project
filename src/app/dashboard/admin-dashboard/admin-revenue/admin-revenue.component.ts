import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { 
  Transaction, 
  RevenueSummary, 
  getMockTransactions, 
  getRevenueSummary,
  getMonthlyRevenue 
} from '../../../services/mock-data.service';

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
  statusOptions: string[] = ['All', 'Completed', 'Pending', 'Refunded'];
  methodOptions: string[] = ['All', 'Credit Card', 'Debit Card', 'UPI', 'Bank Transfer', 'PayPal'];

  constructor(private router: Router) {}

  ngOnInit(): void {
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

  loadData(): void {
    // Load revenue summary
    this.revenueSummary = getRevenueSummary();

    // Load monthly revenue for chart
    this.monthlyRevenue = getMonthlyRevenue();

    // Load transactions
    this.transactions = getMockTransactions();
    this.filteredTransactions = [...this.transactions];

    // Get recent transactions (latest 5)
    this.recentTransactions = this.transactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
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
      case 'Refunded': return 'refunded';
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
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    this.router.navigate(['/login']);
  }
}

