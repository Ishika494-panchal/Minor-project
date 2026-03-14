import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

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
  styleUrls: ['./client-settings.component.css']
})
export class ClientSettingsComponent implements OnInit {
  userData: any = null;
  settings: ClientSettings | null = null;
  
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

  constructor(
    private router: Router
  ) {}

  ngOnInit(): void {
    const userDataStr = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    if (userDataStr) {
      this.userData = JSON.parse(userDataStr);
      this.loadSettings();
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
    // In a real app, this would validate current password with backend
    this.closeChangePasswordModal();
    alert('Password changed successfully!');
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
}

