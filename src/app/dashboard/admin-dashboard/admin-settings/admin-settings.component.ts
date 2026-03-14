import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

export interface AdminSettings {
  // General Settings
  general: {
    platformName: string;
    platformLogo: string;
    contactEmail: string;
    supportEmail: string;
    defaultLanguage: string;
    timeZone: string;
  };
  
  // User Management Settings
  userManagement: {
    enableRegistration: boolean;
    freelancerVerification: boolean;
    emailVerification: boolean;
    profileUpdateLimit: number;
  };
  
  // Payment Settings
  payment: {
    commissionPercentage: number;
    paymentMethods: string[];
    minimumWithdrawal: number;
    paymentProcessing: string;
  };
  
  // Notification Settings
  notifications: {
    emailNotifications: boolean;
    systemNotifications: boolean;
    newProjectAlerts: boolean;
    paymentNotifications: boolean;
    userActivityAlerts: boolean;
  };
  
  // Security Settings
  security: {
    twoFactorAuth: boolean;
    passwordStrength: string;
    sessionTimeout: number;
  };
  
  // Admin Profile
  profile: {
    name: string;
    email: string;
    profilePicture: string;
  };
}

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './admin-settings.component.html',
  styleUrls: ['./admin-settings.component.css']
})
export class AdminSettingsComponent implements OnInit {
  userData: any = null;
  settings: AdminSettings | null = null;
  activeTab: string = 'general';
  showSaveConfirmation: boolean = false;
  
  // Password change fields
  showPasswordModal: boolean = false;
  currentPassword: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  
  // Available options
  languages = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'hi', label: 'Hindi' }
  ];
  
  timeZones = [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'Eastern Time (US)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
    { value: 'Europe/London', label: 'London' },
    { value: 'Asia/Kolkata', label: 'India (IST)' },
    { value: 'Asia/Tokyo', label: 'Tokyo' }
  ];
  
  passwordStrengths = [
    { value: 'weak', label: 'Weak' },
    { value: 'medium', label: 'Medium' },
    { value: 'strong', label: 'Strong' },
    { value: 'very_strong', label: 'Very Strong' }
  ];
  
  paymentProcessingOptions = [
    { value: 'instant', label: 'Instant' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' }
  ];
  
  availablePaymentMethods = ['Credit Card', 'Debit Card', 'PayPal', 'UPI', 'Bank Transfer', 'Crypto'];
  
  constructor(
    private router: Router
  ) {}

  ngOnInit(): void {
    const userDataStr = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    if (userDataStr) {
      this.userData = JSON.parse(userDataStr);
      if (this.userData.role !== 'admin') {
        this.redirectBasedOnRole();
        return;
      }
      this.loadSettings();
    } else {
      this.router.navigate(['/login']);
    }
  }
  
  loadSettings(): void {
    // Load from localStorage or use defaults
    const storedSettings = localStorage.getItem('adminSettings');
    if (storedSettings) {
      this.settings = JSON.parse(storedSettings);
    } else {
      this.settings = this.getDefaultSettings();
    }
  }
  
  getDefaultSettings(): AdminSettings {
    return {
      general: {
        platformName: 'Skillzyy',
        platformLogo: 'assets/skillzyy-logo.png',
        contactEmail: 'contact@skillzyy.com',
        supportEmail: 'support@skillzyy.com',
        defaultLanguage: 'en',
        timeZone: 'Asia/Kolkata'
      },
      userManagement: {
        enableRegistration: true,
        freelancerVerification: true,
        emailVerification: true,
        profileUpdateLimit: 5
      },
      payment: {
        commissionPercentage: 10,
        paymentMethods: ['Credit Card', 'PayPal', 'UPI', 'Bank Transfer'],
        minimumWithdrawal: 500,
        paymentProcessing: 'daily'
      },
      notifications: {
        emailNotifications: true,
        systemNotifications: true,
        newProjectAlerts: true,
        paymentNotifications: true,
        userActivityAlerts: true
      },
      security: {
        twoFactorAuth: false,
        passwordStrength: 'strong',
        sessionTimeout: 30
      },
      profile: {
        name: this.userData?.name || 'Admin',
        email: this.userData?.email || 'admin@skillzyy.com',
        profilePicture: ''
      }
    };
  }
  
  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }
  
  togglePaymentMethod(method: string): void {
    if (this.settings) {
      const index = this.settings.payment.paymentMethods.indexOf(method);
      if (index > -1) {
        this.settings.payment.paymentMethods.splice(index, 1);
      } else {
        this.settings.payment.paymentMethods.push(method);
      }
    }
  }
  
  isPaymentMethodEnabled(method: string): boolean {
    return this.settings?.payment.paymentMethods.includes(method) || false;
  }
  
  saveSettings(): void {
    if (this.settings) {
      localStorage.setItem('adminSettings', JSON.stringify(this.settings));
      
      // Also update userData if profile changed
      if (this.userData) {
        const updatedUserData = {
          ...this.userData,
          name: this.settings.profile.name,
          email: this.settings.profile.email
        };
        localStorage.setItem('userData', JSON.stringify(updatedUserData));
        sessionStorage.setItem('userData', JSON.stringify(updatedUserData));
      }
      
      this.showSaveConfirmation = true;
      setTimeout(() => {
        this.showSaveConfirmation = false;
      }, 3000);
    }
  }
  
  openPasswordModal(): void {
    this.showPasswordModal = true;
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
  }
  
  closePasswordModal(): void {
    this.showPasswordModal = false;
  }
  
  savePassword(): void {
    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      alert('Please fill in all password fields');
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
    
    this.closePasswordModal();
    alert('Password changed successfully!');
  }
  
  onLogoUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (this.settings) {
          this.settings.general.platformLogo = e.target?.result as string;
        }
      };
      reader.readAsDataURL(input.files[0]);
    }
  }
  
  onProfilePictureUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (this.settings) {
          this.settings.profile.profilePicture = e.target?.result as string;
        }
      };
      reader.readAsDataURL(input.files[0]);
    }
  }
  
  redirectBasedOnRole(): void {
    if (this.userData?.role === 'client') {
      this.router.navigate(['/client-dashboard']);
    } else if (this.userData?.role === 'freelancer') {
      this.router.navigate(['/freelancer-dashboard']);
    } else {
      this.router.navigate(['/login']);
    }
  }
  
  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('adminSettings');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    this.router.navigate(['/login']);
  }
}

