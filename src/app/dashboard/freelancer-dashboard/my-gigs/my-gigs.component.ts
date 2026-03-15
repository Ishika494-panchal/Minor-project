import { ChangeDetectorRef, Component, NgZone, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BackendGig, GigService } from '../../../services/gig.service';
import { finalize } from 'rxjs/operators';
import { NotificationItem as BackendNotification, NotificationService } from '../../../services/notification.service';

interface Gig {
  id: string;
  image: string;
  title: string;
  category: string;
  description: string;
  tags: string[];
  portfolioLink?: string;
  startingPrice: number;
  deliveryTime: number;
  status: 'Active' | 'Paused' | 'Draft';
}

interface NotificationItem {
  id: string;
  type: string;
  message: string;
  time: string;
  read: boolean;
  actionUrl?: string;
}

@Component({
  selector: 'app-my-gigs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-gigs.component.html',
  styleUrls: ['./my-gigs.component.css']
})
export class MyGigsComponent implements OnInit {
  // Navbar
  isMobileOrTablet = false;
  isSidebarOpen = false;
  showNotifications = false;
  showProfileMenu = false;
  searchQuery = '';
  userData: any = null;

  // Notifications
  notificationsList: NotificationItem[] = [];
  unreadBellCount = 0;

  gigs: Gig[] = [];
  isLoadingGigs = false;
  selectedGig: Gig | null = null;

  constructor(
    private router: Router,
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

    this.loadGigs();
    this.loadNotifications();
    this.loadUnreadCount();
  }

  private mapGig(gig: BackendGig): Gig {
    return {
      id: gig._id,
      image: gig.images?.[0] || 'assets/client.jpeg',
      title: gig.title,
      category: gig.category,
      description: gig.description || '',
      tags: gig.tags || [],
      portfolioLink: gig.portfolioLink || '',
      startingPrice: gig.price,
      deliveryTime: gig.deliveryDays,
      status: (gig.status as Gig['status']) || 'Draft'
    };
  }

  loadGigs(): void {
    this.isLoadingGigs = true;
    this.gigService.getMyGigs()
      .pipe(finalize(() => {
        this.ngZone.run(() => {
          this.isLoadingGigs = false;
          this.cdr.detectChanges();
        });
      }))
      .subscribe({
        next: (gigs) => {
          this.ngZone.run(() => {
            this.gigs = gigs.map((gig) => this.mapGig(gig));
            this.cdr.detectChanges();
          });
        },
        error: (error) => {
          console.error('Error loading gigs:', error);
          this.ngZone.run(() => {
            this.gigs = [];
            this.cdr.detectChanges();
          });
        }
      });
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

  getStatusClass(status: string): string {
    return status.toLowerCase();
  }

  editGig(gig: Gig): void {
    this.router.navigate(['/create-gig'], { queryParams: { edit: gig.id } });
  }

  deleteGig(gig: Gig): void {
    if (confirm(`Are you sure you want to delete "${gig.title}"?`)) {
      this.gigService.deleteGig(gig.id).subscribe({
        next: () => {
          this.gigs = this.gigs.filter((g) => g.id !== gig.id);
        },
        error: (error) => {
          alert(error?.message || 'Failed to delete gig. Please try again.');
        }
      });
    }
  }

  viewGig(gig: Gig): void {
    this.selectedGig = gig;
  }

  closeGigModal(): void {
    this.selectedGig = null;
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.selectedGig) {
      this.closeGigModal();
    }
  }

  createNewGig(): void {
    console.log('Create new gig');
    this.router.navigate(['/create-gig']);
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

  goToMessages(): void {
    this.closeSidebar();
    this.router.navigate(['/freelancer-messages']);
  }

  goToProjects(): void {
    this.closeSidebar();
    this.router.navigate(['/my-projects']);
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

