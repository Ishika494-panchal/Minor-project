import { ChangeDetectorRef, Component, HostListener, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GigService, SaveGigPayload } from '../../../services/gig.service';
import { NotificationItem as BackendNotification, NotificationService } from '../../../services/notification.service';

interface NotificationItem {
  id: string;
  type: string;
  message: string;
  time: string;
  read: boolean;
  actionUrl?: string;
}

@Component({
  selector: 'app-create-gig',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-gig.component.html',
  styleUrls: ['./create-gig.component.css']
})
export class CreateGigComponent implements OnInit {
  // Navbar
  isMobileOrTablet = false;
  isSidebarOpen = false;
  showNotifications = false;
  showProfileMenu = false;
  searchQuery = '';
  userData: any = null;

  // Form data
  gigTitle = '';
  category = '';
  description = '';
  skills = '';
  portfolioLink = '';
  price = '';
  deliveryTime = '';
  tags = '';
  selectedImage: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;
  isSubmitting = false;
  isEditMode = false;
  editingGigId = '';

  // Dropdown options
  categories = [
    'Web Development',
    'Mobile App Development',
    'UI/UX Design',
    'Graphic Design',
    'Content Writing'
  ];

  deliveryOptions = [
    { value: '1', label: '1 Day' },
    { value: '3', label: '3 Days' },
    { value: '5', label: '5 Days' },
    { value: '7', label: '7 Days' },
    { value: '10', label: '10 Days' }
  ];

  // Notifications
  notificationsList: NotificationItem[] = [];
  unreadBellCount = 0;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private gigService: GigService,
    private notificationService: NotificationService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.updateViewportState();
    const userDataStr = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    if (userDataStr) {
      this.userData = JSON.parse(userDataStr);
    } else {
      this.userData = {
        fullName: 'John Doe',
        email: 'john@example.com',
        avatar: ''
      };
    }

    const editId = this.route.snapshot.queryParamMap.get('edit') || '';
    if (editId) {
      this.isEditMode = true;
      this.editingGigId = editId;
      this.loadGigForEditing(editId);
    }
    this.loadNotifications();
    this.loadUnreadCount();
  }

  private loadGigForEditing(gigId: string): void {
    this.gigService.getGigById(gigId).subscribe({
      next: (gig) => {
        this.ngZone.run(() => {
          this.gigTitle = gig.title || '';
          this.category = gig.category || '';
          this.description = gig.description || '';
          this.skills = (gig.tags || []).join(', ');
          this.portfolioLink = gig.portfolioLink || '';
          this.price = String(gig.price || '');
          this.deliveryTime = String(gig.deliveryDays || '');
          this.tags = (gig.tags || []).join(', ');
          this.imagePreview = gig.images?.[0] || null;
          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        alert(error?.message || 'Unable to load gig for editing.');
        this.router.navigate(['/my-gigs']);
      }
    });
  }

  private buildGigPayload(status: 'Active' | 'Draft'): SaveGigPayload {
    const tagValues = (this.tags || this.skills || '')
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => !!tag);

    return {
      title: this.gigTitle.trim(),
      category: this.category,
      description: this.description.trim(),
      tags: tagValues,
      portfolioLink: this.portfolioLink.trim(),
      price: Number(this.price),
      deliveryDays: Number(this.deliveryTime),
      images: this.imagePreview ? [String(this.imagePreview)] : [],
      status
    };
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

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const maxImageSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxImageSize) {
        alert('Image size should be 5MB or less.');
        input.value = '';
        return;
      }

      this.selectedImage = file;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(): void {
    this.selectedImage = null;
    this.imagePreview = null;
  }

  publishGig(): void {
    if (this.isSubmitting) {
      return;
    }

    if (!this.gigTitle || !this.category || !this.description || !this.price || !this.deliveryTime) {
      alert('Please fill in all required fields');
      return;
    }

    this.isSubmitting = true;
    const payload = this.buildGigPayload('Active');

    const request$ = this.isEditMode
      ? this.gigService.updateGig(this.editingGigId, payload)
      : this.gigService.createGig(payload);

    request$.subscribe({
      next: () => {
        alert(this.isEditMode ? 'Gig updated successfully!' : 'Gig published successfully!');
        this.router.navigate(['/my-gigs'], { queryParams: { refresh: Date.now() } });
      },
      error: (error) => {
        alert(error?.message || 'Failed to save gig. Please try again.');
        this.isSubmitting = false;
      },
      complete: () => {
        this.isSubmitting = false;
      }
    });
  }

  saveDraft(): void {
    if (this.isSubmitting) {
      return;
    }
    if (!this.gigTitle || !this.category || !this.description || !this.price || !this.deliveryTime) {
      alert('Please fill in required fields before saving draft');
      return;
    }

    this.isSubmitting = true;
    const payload = this.buildGigPayload('Draft');

    const request$ = this.isEditMode
      ? this.gigService.updateGig(this.editingGigId, payload)
      : this.gigService.createGig(payload);

    request$.subscribe({
      next: () => {
        alert('Gig saved as draft!');
        this.router.navigate(['/my-gigs'], { queryParams: { refresh: Date.now() } });
      },
      error: (error) => {
        alert(error?.message || 'Failed to save draft. Please try again.');
        this.isSubmitting = false;
      },
      complete: () => {
        this.isSubmitting = false;
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/my-gigs']);
  }

  // Navbar methods
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

  toggleNotifications(event: Event): void {
    event.stopPropagation();
    this.showNotifications = !this.showNotifications;
    this.showProfileMenu = false;
    if (this.showNotifications) {
      this.loadNotifications();
    }
  }

  toggleProfileMenu(event: Event): void {
    event.stopPropagation();
    this.showProfileMenu = !this.showProfileMenu;
    this.showNotifications = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-wrapper') && !target.closest('.profile-wrapper')) {
      this.showNotifications = false;
      this.showProfileMenu = false;
    }
    if (this.isMobileOrTablet && this.isSidebarOpen && !target.closest('.sidebar') && !target.closest('.hamburger-btn')) {
      this.isSidebarOpen = false;
    }
  }

  search(): void {
    console.log('Searching:', this.searchQuery);
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

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notificationsList = this.notificationsList.map((item) => ({ ...item, read: true }));
        this.unreadBellCount = 0;
      }
    });
  }

  onNotificationClick(notification: NotificationItem, event?: Event): void {
    event?.stopPropagation();
    if (!notification.read) {
      this.notificationService.markAsRead(notification.id).subscribe({
        next: () => {
          this.notificationsList = this.notificationsList.map((item) =>
            item.id === notification.id ? { ...item, read: true } : item
          );
          this.unreadBellCount = Math.max(0, this.unreadBellCount - 1);
        }
      });
    }
    if (notification.actionUrl) {
      this.showNotifications = false;
      this.router.navigateByUrl(notification.actionUrl);
    }
  }

  deleteNotification(notification: NotificationItem, event?: Event): void {
    event?.stopPropagation();
    this.notificationService.archiveNotification(notification.id).subscribe({
      next: () => {
        const wasUnread = !notification.read;
        this.notificationsList = this.notificationsList.filter((item) => item.id !== notification.id);
        if (wasUnread) {
          this.unreadBellCount = Math.max(0, this.unreadBellCount - 1);
        }
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

  goToProfile(): void {
    this.showProfileMenu = false;
    this.closeSidebar();
    this.router.navigate(['/freelancer-profile']);
  }

  goToSettings(): void {
    this.showProfileMenu = false;
    this.closeSidebar();
    this.router.navigate(['/freelancer-settings']);
  }

  goToDashboard(): void {
    this.closeSidebar();
    this.router.navigate(['/freelancer-dashboard']);
  }

  goToFindJobs(): void {
    this.closeSidebar();
    this.router.navigate(['/find-jobs']);
  }

  goToMyGigs(): void {
    this.closeSidebar();
    this.router.navigate(['/my-gigs']);
  }

  goToEarnings(): void {
    this.closeSidebar();
    this.router.navigate(['/freelancer-earnings']);
  }

  private loadNotifications(): void {
    this.notificationService.getMyNotifications(20, 1).subscribe({
      next: (res) => {
        this.notificationsList = (res?.notifications || []).map((item: BackendNotification) => ({
          id: String(item.id),
          type: item.type,
          message: item.message || item.title || 'New update',
          time: this.toRelativeTime(item.createdAt),
          read: !!item.isRead,
          actionUrl: item.actionUrl || ''
        }));
        this.unreadBellCount = Number(res?.unreadCount || 0);
      }
    });
  }

  private loadUnreadCount(): void {
    this.notificationService.getUnreadCount().subscribe({
      next: (res) => {
        this.unreadBellCount = Number(res?.unreadCount || 0);
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

