import { ChangeDetectorRef, Component, HostListener, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NotificationItem as BackendNotification, NotificationService } from '../../../services/notification.service';

export interface ClientProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  profilePicture: string;
  bio: string;
  companyName: string;
  industry: string;
  website: string;
  memberSince: string;
  totalProjectsPosted: number;
  totalFreelancersHired: number;
}

@Component({
  selector: 'app-client-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './client-profile.component.html',
  styleUrls: ['./client-profile.component.css', '../client-responsive-shared.css']
})
export class ClientProfileComponent implements OnInit {
  userData: any = null;
  profile: ClientProfile | null = null;
  isSidebarOpen = false;
  showProfileMenu = false;
  showNotifications = false;
  notificationsList: any[] = [];
  unreadBellCount = 0;
  isEditing: boolean = false;
  selectedFile: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;

  constructor(
    private router: Router,
    private notificationService: NotificationService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const userDataStr = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    if (userDataStr) {
      this.userData = JSON.parse(userDataStr);
      this.loadProfile();
      this.loadNotifications();
      this.loadUnreadCount();
    } else {
      this.router.navigate(['/login']);
    }
  }

  loadProfile(): void {
    // Use actual user data from localStorage/sessionStorage
    if (this.userData) {
      this.profile = {
        id: this.userData.id || '',
        fullName: this.userData.fullName || 'Not provided',
        email: this.userData.email || 'Not provided',
        phone: this.userData.phone || 'Not provided',
        location: this.userData.location || 'Not provided',
        profilePicture: this.userData.profilePicture || 'assets/client.jpeg',
        bio: this.userData.bio || 'No bio provided',
        companyName: this.userData.companyName || 'Not provided',
        industry: this.userData.industry || 'Not provided',
        website: this.userData.website || '',
        memberSince: this.userData.memberSince || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        totalProjectsPosted: this.userData.totalProjectsPosted || 0,
        totalFreelancersHired: this.userData.totalFreelancersHired || 0
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

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    // Reset image preview when closing modal
    if (!this.isEditing) {
      this.selectedFile = null;
      this.imagePreview = null;
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  removeSelectedImage(): void {
    this.selectedFile = null;
    this.imagePreview = null;
  }

  saveProfile(): void {
    // Save updated profile data to localStorage
    if (this.profile) {
      // Update the profile picture if a new one was selected
      if (this.imagePreview) {
        this.profile.profilePicture = this.imagePreview as string;
      }
      
      // Update userData with profile changes
      const updatedUserData = {
        ...this.userData,
        fullName: this.profile.fullName,
        email: this.profile.email,
        phone: this.profile.phone,
        location: this.profile.location,
        bio: this.profile.bio,
        companyName: this.profile.companyName,
        industry: this.profile.industry,
        website: this.profile.website,
        profilePicture: this.profile.profilePicture
      };
      
      localStorage.setItem('userData', JSON.stringify(updatedUserData));
      sessionStorage.setItem('userData', JSON.stringify(updatedUserData));
      this.userData = updatedUserData;
    }
    
    this.isEditing = false;
    this.selectedFile = null;
    this.imagePreview = null;
    alert('Profile updated successfully!');
  }

  changePassword(): void {
    alert('Password change functionality would open a modal here.');
  }

  goToSettings(): void {
    this.showProfileMenu = false;
    this.router.navigate(['/client-settings']);
  }

  goToProfile(): void {
    this.showProfileMenu = false;
    this.router.navigate(['/client-profile']);
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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.top-profile-wrapper') && !target.closest('.notification-wrapper')) {
      this.showProfileMenu = false;
      this.showNotifications = false;
    }
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    this.router.navigate(['/login']);
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

