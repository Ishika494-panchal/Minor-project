import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface NotificationItem {
  id: number;
  type: string;
  message: string;
  time: string;
  read: boolean;
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
  showNotifications = false;
  showProfileMenu = false;
  searchQuery = '';
  userData: any = null;

  // Form data
  gigTitle = '';
  category = '';
  description = '';
  skills = '';
  price = '';
  deliveryTime = '';
  tags = '';
  selectedImage: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;

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
  notificationsList: NotificationItem[] = [
    {
      id: 1,
      type: 'job',
      message: 'New job matching your skills: React Developer',
      time: '2 hours ago',
      read: false
    },
    {
      id: 2,
      type: 'message',
      message: 'You have a new message from Tech Solutions Inc.',
      time: '5 hours ago',
      read: false
    },
    {
      id: 3,
      type: 'payment',
      message: 'Payment received: ₹15,000',
      time: '1 day ago',
      read: true
    }
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
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
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedImage = input.files[0];
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result;
      };
      reader.readAsDataURL(this.selectedImage);
    }
  }

  removeImage(): void {
    this.selectedImage = null;
    this.imagePreview = null;
  }

  publishGig(): void {
    if (!this.gigTitle || !this.category || !this.description || !this.price || !this.deliveryTime) {
      alert('Please fill in all required fields');
      return;
    }

    console.log('Publishing gig:', {
      title: this.gigTitle,
      category: this.category,
      description: this.description,
      skills: this.skills,
      price: this.price,
      deliveryTime: this.deliveryTime,
      tags: this.tags,
      image: this.selectedImage
    });

    alert('Gig published successfully!');
    this.router.navigate(['/my-gigs']);
  }

  saveDraft(): void {
    console.log('Saving gig as draft:', {
      title: this.gigTitle,
      category: this.category,
      description: this.description,
      skills: this.skills,
      price: this.price,
      deliveryTime: this.deliveryTime,
      tags: this.tags
    });

    alert('Gig saved as draft!');
    this.router.navigate(['/my-gigs']);
  }

  cancel(): void {
    this.router.navigate(['/my-gigs']);
  }

  // Navbar methods
  toggleNotifications(event: Event): void {
    event.stopPropagation();
    this.showNotifications = !this.showNotifications;
    this.showProfileMenu = false;
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
  }

  search(): void {
    console.log('Searching:', this.searchQuery);
  }

  getNotificationIcon(type: string): string {
    const icons: { [key: string]: string } = {
      job: 'fas fa-briefcase',
      payment: 'fas fa-dollar-sign',
      message: 'fas fa-envelope',
      project: 'fas fa-folder-open',
      review: 'fas fa-star'
    };
    return icons[type] || 'fas fa-bell';
  }

  get unreadCount(): number {
    return this.notificationsList.filter(n => !n.read).length;
  }

  markAllAsRead(): void {
    this.notificationsList.forEach(n => n.read = true);
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    this.router.navigate(['/login']);
  }

  goToProfile(): void {
    this.showProfileMenu = false;
  }

  goToSettings(): void {
    this.showProfileMenu = false;
  }

  goToDashboard(): void {
    this.router.navigate(['/freelancer-dashboard']);
  }

  goToFindJobs(): void {
    this.router.navigate(['/find-jobs']);
  }

  goToMyGigs(): void {
    this.router.navigate(['/my-gigs']);
  }

  goToEarnings(): void {
    this.router.navigate(['/freelancer-earnings']);
  }
}

