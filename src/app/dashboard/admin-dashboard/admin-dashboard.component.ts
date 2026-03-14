import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { getAdminStats, getAdminRecentActivities } from '../../services/mock-data.service';

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
    activeProjects: 0,
    totalRevenue: 0
  };
  recentActivities: any[] = [];
  isLoading = false;

  constructor(
    private router: Router
  ) {}

  ngOnInit(): void {
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

  loadAdminData(): void {
    this.isLoading = true;
    try {
      // Load stats
      const adminStats = getAdminStats();
      this.stats = {
        totalUsers: adminStats.totalUsers || 0,
        activeProjects: adminStats.activeProjects || 0,
        totalRevenue: adminStats.totalRevenue || 0
      };

      // Load recent activities
      this.recentActivities = getAdminRecentActivities();
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    this.router.navigate(['/login']);
  }

  goToNotifications(): void {
    this.router.navigate(['/admin-messages']);
  }

  goToSettings(): void {
    this.router.navigate(['/admin-settings']);
  }
}

