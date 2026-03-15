import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-freelancer-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './freelancer-settings.component.html',
  styleUrls: ['./freelancer-settings.component.css']
})
export class FreelancerSettingsComponent implements OnInit {
  userData: any = null;
  isMobileOrTablet = false;
  isSidebarOpen = false;
  showProfileMenu = false;
  accountMessage = '';
  passwordMessage = '';
  notificationMessage = '';
  
  // Account Settings Form
  accountSettings = {
    email: '',
    phone: ''
  };

  // Password Form
  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  // Notification Settings
  notifications = {
    emailNotifications: true,
    messageNotifications: true,
    projectUpdates: true,
    paymentNotifications: false
  };

  // Privacy Settings
  privacy = {
    profileVisibility: 'public',
    showEmailToClients: true,
    showPhoneNumber: false
  };

  constructor(public router: Router) {}

  ngOnInit(): void {
    this.updateViewportState();
    const userDataStr = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    if (userDataStr) {
      this.userData = JSON.parse(userDataStr);
      this.accountSettings.email = this.userData?.email || 'freelancer@example.com';
      this.accountSettings.phone = this.userData?.phone || '+91 9876543210';
    } else {
      this.accountSettings.email = 'freelancer@example.com';
      this.accountSettings.phone = '+91 9876543210';
    }

    this.loadSavedPreferences();
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

  saveAccountSettings(): void {
    this.accountMessage = '';

    const updatedUserData = {
      ...(this.userData || {}),
      email: this.accountSettings.email.trim(),
      phone: this.accountSettings.phone.trim()
    };

    this.userData = updatedUserData;
    localStorage.setItem('userData', JSON.stringify(updatedUserData));
    sessionStorage.setItem('userData', JSON.stringify(updatedUserData));
    this.accountMessage = 'Account details updated successfully.';
  }

  changePassword(): void {
    this.passwordMessage = '';
    const currentPassword = this.passwordForm.currentPassword.trim();
    const newPassword = this.passwordForm.newPassword.trim();
    const confirmPassword = this.passwordForm.confirmPassword.trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
      this.passwordMessage = 'Please fill all password fields.';
      return;
    }

    if (newPassword.length < 6) {
      this.passwordMessage = 'New password must be at least 6 characters.';
      return;
    }

    if (newPassword !== confirmPassword) {
      this.passwordMessage = 'New password and confirm password do not match.';
      return;
    }

    const userId = this.userData?.id || this.userData?._id || 'guest';
    localStorage.setItem(`freelancer:lastPasswordChange:${userId}`, new Date().toISOString());

    this.passwordForm = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
    this.passwordMessage = 'Password changed successfully.';
  }

  saveNotificationSettings(): void {
    this.notificationMessage = '';
    const storageKey = this.getSettingsStorageKey();
    const payload = {
      notifications: this.notifications,
      privacy: this.privacy
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
    this.notificationMessage = 'Notification settings saved successfully.';
  }

  updatePrivacySettings(): void {
    this.saveNotificationSettings();
  }

  logout(): void {
    this.closeSidebar();
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    this.router.navigate(['/login']);
  }

  goToProfile(): void {
    this.closeSidebar();
    this.router.navigate(['/freelancer-profile']);
  }

  goToSettings(): void {
    // Already on settings page
    this.closeSidebar();
  }

  private getSettingsStorageKey(): string {
    const userId = this.userData?.id || this.userData?._id || 'guest';
    return `freelancer:settings:${userId}`;
  }

  private loadSavedPreferences(): void {
    const raw = localStorage.getItem(this.getSettingsStorageKey());
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      if (parsed?.notifications) {
        this.notifications = {
          ...this.notifications,
          ...parsed.notifications
        };
      }
      if (parsed?.privacy) {
        this.privacy = {
          ...this.privacy,
          ...parsed.privacy
        };
      }
    } catch {
      // Ignore corrupted local state and keep defaults.
    }
  }

  toggleSidebar(event?: Event): void {
    event?.stopPropagation();
    if (!this.isMobileOrTablet) {
      return;
    }
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar(): void {
    if (this.isMobileOrTablet) {
      this.isSidebarOpen = false;
    }
  }

  toggleProfileMenu(event: Event): void {
    event.stopPropagation();
    this.showProfileMenu = !this.showProfileMenu;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.profile-wrapper')) {
      this.showProfileMenu = false;
    }
    if (this.isMobileOrTablet && this.isSidebarOpen && !target.closest('.sidebar') && !target.closest('.hamburger-btn')) {
      this.isSidebarOpen = false;
    }
  }
}

