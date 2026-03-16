import { ChangeDetectorRef, Component, HostListener, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  userData: any = null;
  stats = {
    totalUsers: 0,
    totalFreelancers: 0,
    totalClients: 0,
    totalServices: 0,
    totalOrders: 0,
    totalPayments: 0
  };
  recentActivities: any[] = [];
  isLoading = false;
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
      // Check if user is admin
      if (this.userData.role !== 'admin') {
        // Redirect non-admin users
        if (this.userData.role === 'client') {
          this.router.navigate(['/client-dashboard']);
        } else if (this.userData.role === 'freelancer') {
          this.router.navigate(['/freelancer-dashboard']);
        } else {
          this.router.navigate(['/login']);
        }
        return;
      }
      // Load admin dashboard data
      this.loadAdminData();
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

  loadAdminData(): void {
    this.isLoading = true;
    this.cdr.detectChanges();
    this.adminService.getOverview().subscribe({
      next: (response) => {
        this.ngZone.run(() => {
          const overview = response?.overview || {};
          this.stats = {
            totalUsers: Number(overview.totalUsers || 0),
            totalFreelancers: Number(overview.totalFreelancers || 0),
            totalClients: Number(overview.totalClients || 0),
            totalServices: Number(overview.totalServices || 0),
            totalOrders: Number(overview.totalOrders || 0),
            totalPayments: Number(overview.totalPayments || 0)
          };
          this.recentActivities = Array.isArray(response?.recentActivities) ? response.recentActivities : [];
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        console.error('Error loading admin data:', error);
        this.ngZone.run(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  logout(): void {
    this.closeSidebar();
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    this.router.navigate(['/login']);
  }

  goToSettings(): void {
    this.closeSidebar();
    this.cdr.detectChanges();
    this.router.navigate(['/admin-settings']);
  }
}

