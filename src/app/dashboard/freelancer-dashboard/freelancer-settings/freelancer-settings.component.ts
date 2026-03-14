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
  showProfileMenu = false;
  
  // Account Settings Form
  accountSettings = {
    email: '',
    phone: '',
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
    const userDataStr = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    if (userDataStr) {
      this.userData = JSON.parse(userDataStr);
      this.accountSettings.email = this.userData?.email || 'freelancer@example.com';
      this.accountSettings.phone = this.userData?.phone || '+91 9876543210';
    } else {
      this.accountSettings.email = 'freelancer@example.com';
      this.accountSettings.phone = '+91 9876543210';
    }
  }

  saveAccountSettings(): void {
    console.log('Saving account settings:', this.accountSettings);
    // Add your save logic here
    alert('Account settings saved successfully!');
  }

  updatePrivacySettings(): void {
    console.log('Updating privacy settings:', this.privacy);
    // Add your update logic here
    alert('Privacy settings updated successfully!');
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    this.router.navigate(['/login']);
  }

  goToProfile(): void {
    this.router.navigate(['/freelancer-profile']);
  }

  goToSettings(): void {
    // Already on settings page
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
  }
}

