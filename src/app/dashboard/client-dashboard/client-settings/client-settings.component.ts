import { ChangeDetectorRef, Component, HostListener, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NotificationItem as BackendNotification, NotificationService } from '../../../services/notification.service';
import { API_BASE_URL } from '../../../services/api.config';

export interface ClientSettings {
  email: string;
  notifications: {
    newProposals: boolean;
    projectUpdates: boolean;
    messages: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private';
    showContactInfo: boolean;
  };
  paymentMethods: PaymentMethod[];
}

export interface PaymentMethod {
  id: string;
  type: 'upi' | 'bank';
  upiId?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  isDefault: boolean;
}

@Component({
  selector: 'app-client-settings',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './client-settings.component.html',
  styleUrls: ['./client-settings.component.css', '../client-responsive-shared.css']
})
export class ClientSettingsComponent implements OnInit {
  userData: any = null;
  settings: ClientSettings | null = null;
  isSidebarOpen = false;
  showProfileMenu = false;
  showNotifications = false;
  notificationsList: any[] = [];
  unreadBellCount = 0;
  
  showAddPaymentModal: boolean = false;
  showChangePasswordModal: boolean = false;
  showChangeEmailModal: boolean = false;
  
  newPaymentMethod: PaymentMethod = {
    id: '',
    type: 'upi',
    upiId: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    isDefault: false
  };

  newEmail: string = '';
  currentPassword: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  isChangingPassword = false;

  constructor(
    private router: Router,
    private http: HttpClient,
    private notificationService: NotificationService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const userDataStr = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    if (userDataStr) {
      this.userData = JSON.parse(userDataStr);
      this.loadSettings();
      this.loadNotifications();
      this.loadUnreadCount();
    } else {
      this.router.navigate(['/login']);
    }
  }

  loadSettings(): void {
    // Load settings from userData in localStorage
    if (this.userData) {
      this.settings = {
        email: this.userData.email || '',
        notifications: {
          newProposals: this.userData.notifications?.newProposals ?? true,
          projectUpdates: this.userData.notifications?.projectUpdates ?? true,
          messages: this.userData.notifications?.messages ?? true
        },
        privacy: {
          profileVisibility: this.userData.privacy?.profileVisibility || 'public',
          showContactInfo: this.userData.privacy?.showContactInfo ?? true
        },
        paymentMethods: this.userData.paymentMethods || []
      };
    }
  }

  toggleSidebar(event?: Event): void {
    event?.stopPropagation();
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
  }

  toggleProfileMenu(event: Event): void {
    event.stopPropagation();
    this.showProfileMenu = !this.showProfileMenu;
    this.showNotifications = false;
  }

  toggleNotifications(event: Event): void {
    event.stopPropagation();
    this.showNotifications = !this.showNotifications;
    this.showProfileMenu = false;
    if (this.showNotifications) {
      this.loadNotifications();
    }
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.notificationsList = this.notificationsList.map((item: any) => ({ ...item, read: true }));
          this.unreadBellCount = 0;
          this.cdr.detectChanges();
        });
      }
    });
  }

  onNotificationClick(notification: any, event?: Event): void {
    event?.stopPropagation();
    if (!notification?.read && notification?.id) {
      this.notificationService.markAsRead(String(notification.id)).subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.notificationsList = this.notificationsList.map((item: any) =>
              String(item.id) === String(notification.id) ? { ...item, read: true } : item
            );
            this.unreadBellCount = Math.max(0, this.unreadBellCount - 1);
            this.cdr.detectChanges();
          });
        }
      });
    }
    const actionUrl = String(notification?.actionUrl || '').trim();
    if (actionUrl) {
      this.showNotifications = false;
      this.router.navigateByUrl(actionUrl);
    }
  }

  deleteNotification(notification: any, event?: Event): void {
    event?.stopPropagation();
    const id = String(notification?.id || '').trim();
    if (!id) return;
    this.notificationService.archiveNotification(id).subscribe({
      next: () => {
        this.ngZone.run(() => {
          const wasUnread = !notification?.read;
          this.notificationsList = this.notificationsList.filter((item: any) => String(item.id) !== id);
          if (wasUnread) {
            this.unreadBellCount = Math.max(0, this.unreadBellCount - 1);
          }
          this.cdr.detectChanges();
        });
      }
    });
  }

  getNotificationIcon(type: string): string {
    const icons: Record<string, string> = {
      chat_message: 'fas fa-envelope',
      order_created: 'fas fa-shopping-cart',
      order_accepted: 'fas fa-check-circle',
      delivery_submitted: 'fas fa-upload',
      revision_requested: 'fas fa-rotate-left',
      payment_success: 'fas fa-dollar-sign',
      project_approved: 'fas fa-circle-check',
      dispute_opened: 'fas fa-gavel',
      system_alert: 'fas fa-triangle-exclamation'
    };
    return icons[type] || 'fas fa-bell';
  }

  get unreadCount(): number {
    return this.unreadBellCount;
  }

  goToProfile(): void {
    this.showProfileMenu = false;
    this.router.navigate(['/client-profile']);
  }

  goToSettings(): void {
    this.showProfileMenu = false;
    this.router.navigate(['/client-settings']);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.top-profile-wrapper') && !target.closest('.notification-wrapper')) {
      this.showProfileMenu = false;
      this.showNotifications = false;
    }
  }

  // Toggle notification settings
  toggleNotification(key: keyof ClientSettings['notifications']): void {
    if (this.settings) {
      this.settings.notifications[key] = !this.settings.notifications[key];
      this.saveSettings();
    }
  }

  // Toggle privacy settings
  togglePrivacy(key: keyof ClientSettings['privacy']): void {
    if (this.settings) {
      if (key === 'profileVisibility') {
        this.settings.privacy.profileVisibility = 
          this.settings.privacy.profileVisibility === 'public' ? 'private' : 'public';
      } else {
        this.settings.privacy.showContactInfo = !this.settings.privacy.showContactInfo;
      }
      this.saveSettings();
    }
  }

  // Set default payment method
  setDefaultPayment(paymentId: string): void {
    if (this.settings) {
      this.settings.paymentMethods.forEach(pm => {
        pm.isDefault = pm.id === paymentId;
      });
      this.saveSettings();
    }
  }

  // Delete payment method
  deletePaymentMethod(paymentId: string): void {
    if (this.settings) {
      this.settings.paymentMethods = this.settings.paymentMethods.filter(pm => pm.id !== paymentId);
      this.saveSettings();
    }
  }

  // Open/Close modals
  openAddPaymentModal(): void {
    this.showAddPaymentModal = true;
    this.resetNewPaymentMethod();
  }

  closeAddPaymentModal(): void {
    this.showAddPaymentModal = false;
    this.resetNewPaymentMethod();
  }

  resetNewPaymentMethod(): void {
    this.newPaymentMethod = {
      id: Date.now().toString(),
      type: 'upi',
      upiId: '',
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      isDefault: false
    };
  }

  savePaymentMethod(): void {
    if (this.settings) {
      const newMethod: PaymentMethod = { ...this.newPaymentMethod };
      
      // If marked as default, update others
      if (newMethod.isDefault) {
        this.settings.paymentMethods.forEach(pm => pm.isDefault = false);
      }
      
      this.settings.paymentMethods.push(newMethod);
      this.saveSettings();
      this.closeAddPaymentModal();
      alert('Payment method added successfully!');
    }
  }

  openChangePasswordModal(): void {
    this.showChangePasswordModal = true;
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
  }

  closeChangePasswordModal(): void {
    this.showChangePasswordModal = false;
  }

  savePassword(): void {
    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      alert('Please fill in all fields');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      alert('New passwords do not match');
      return;
    }
    if (this.newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    if (this.isChangingPassword) {
      return;
    }

    this.isChangingPassword = true;
    this.http.put<{ success: boolean; message?: string }>(
      `${API_BASE_URL}/api/auth/change-password`,
      {
        currentPassword: this.currentPassword,
        newPassword: this.newPassword
      },
      { headers: this.getAuthHeaders() }
    ).subscribe({
      next: (response) => {
        this.closeChangePasswordModal();
        alert(response?.message || 'Password changed successfully!');
      },
      error: (error) => {
        alert(error?.error?.message || 'Failed to change password. Please try again.');
        this.isChangingPassword = false;
      },
      complete: () => {
        this.isChangingPassword = false;
      }
    });
  }

  private getAuthHeaders(): HttpHeaders {
    const rawToken = sessionStorage.getItem('authToken') || localStorage.getItem('authToken') || '';
    const token = rawToken.replace(/^"(.*)"$/, '$1').trim();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    });
  }

  openChangeEmailModal(): void {
    this.showChangeEmailModal = true;
    this.newEmail = this.settings?.email || '';
  }

  closeChangeEmailModal(): void {
    this.showChangeEmailModal = false;
  }

  saveEmail(): void {
    if (!this.newEmail) {
      alert('Please enter an email address');
      return;
    }
    if (this.settings) {
      this.settings.email = this.newEmail;
      this.saveSettings();
    }
    this.closeChangeEmailModal();
    alert('Email updated successfully!');
  }

  saveSettings(): void {
    if (this.settings && this.userData) {
      const updatedUserData = {
        ...this.userData,
        email: this.settings.email,
        notifications: this.settings.notifications,
        privacy: this.settings.privacy,
        paymentMethods: this.settings.paymentMethods
      };
      
      localStorage.setItem('userData', JSON.stringify(updatedUserData));
      sessionStorage.setItem('userData', JSON.stringify(updatedUserData));
    }
  }

  logout(): void {
    this.showProfileMenu = false;
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    this.router.navigate(['/login']);
  }

  deleteAccount(): void {
    const confirmDelete = confirm('Are you sure you want to delete your account? This action cannot be undone.');
    if (confirmDelete) {
      // In a real app, this would call the backend API
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('userData');
      this.router.navigate(['/login']);
      alert('Account deleted successfully');
    }
  }

  private loadNotifications(): void {
    this.notificationService.getMyNotifications(20, 1).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.notificationsList = (res?.notifications || []).map((item: BackendNotification) => ({
            id: String(item.id),
            type: item.type,
            message: item.message || item.title || 'New update',
            time: this.toRelativeTime(item.createdAt),
            read: !!item.isRead,
            actionUrl: item.actionUrl || ''
          }));
          this.unreadBellCount = Number(res?.unreadCount || 0);
          this.cdr.detectChanges();
        });
      }
    });
  }

  private loadUnreadCount(): void {
    this.notificationService.getUnreadCount().subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.unreadBellCount = Number(res?.unreadCount || 0);
          this.cdr.detectChanges();
        });
      }
    });
  }

  private toRelativeTime(value: string | Date): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Just now';
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  }
}

