import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

interface NotificationItem {
  id: number;
  type: string;
  message: string;
  time: string;
  read: boolean;
}

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './client-dashboard.component.html',
  styleUrls: ['./client-dashboard.component.css']
})
export class ClientDashboardComponent implements OnInit {
  userData: any = null;
  stats = {
    activeProjects: 0,
    completedProjects: 0,
    totalSpent: 0,
    activeFreelancers: 0
  };
  recentProjects: any[] = [];

  // Notification dropdown
  showNotifications = false;
  notificationsList: NotificationItem[] = [];

  // Profile dropdown
  showProfileMenu = false;

  constructor(
    private router: Router
  ) {}

  ngOnInit(): void {
    const userDataStr = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    if (userDataStr) {
      this.userData = JSON.parse(userDataStr);
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

  // Navigate to post project
  goToPostProject(): void {
    this.router.navigate(['/post-project']);
  }

goToNotifications(event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/messages']);
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

  // Get notification icon based on type
  getNotificationIcon(type: string): string {
    const icons: { [key: string]: string } = {
      application: 'fas fa-user-plus',
      message: 'fas fa-envelope',
      deadline: 'fas fa-clock',
      payment: 'fas fa-check-circle'
    };
    return icons[type] || 'fas fa-bell';
  }

  // Get unread notification count
  get unreadCount(): number {
    return this.notificationsList.filter(n => !n.read).length;
  }

  // Mark all notifications as read
  markAllAsRead(): void {
    this.notificationsList.forEach(n => n.read = true);
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
}

