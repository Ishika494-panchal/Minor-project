import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface Gig {
  id: string;
  image: string;
  title: string;
  category: string;
  startingPrice: number;
  deliveryTime: number;
  status: 'Active' | 'Paused' | 'Draft';
}

interface NotificationItem {
  id: number;
  type: string;
  message: string;
  time: string;
  read: boolean;
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
  showNotifications = false;
  showProfileMenu = false;
  searchQuery = '';
  userData: any = null;

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

  // Gigs data
  gigs: Gig[] = [
    {
      id: '1',
      image: 'assets/client.jpeg',
      title: 'I will build a professional Angular website',
      category: 'Web Development',
      startingPrice: 5000,
      deliveryTime: 5,
      status: 'Active'
    },
    {
      id: '2',
      image: 'assets/client.jpeg',
      title: 'I will create a stunning UI/UX design',
      category: 'UI/UX Design',
      startingPrice: 3500,
      deliveryTime: 3,
      status: 'Active'
    },
    {
      id: '3',
      image: 'assets/client.jpeg',
      title: 'I will develop a responsive React application',
      category: 'Web Development',
      startingPrice: 8000,
      deliveryTime: 7,
      status: 'Paused'
    },
    {
      id: '4',
      image: 'assets/client.jpeg',
      title: 'I will design a beautiful logo for your brand',
      category: 'Graphic Design',
      startingPrice: 2000,
      deliveryTime: 2,
      status: 'Draft'
    },
    {
      id: '5',
      image: 'assets/client.jpeg',
      title: 'I will build a mobile app with React Native',
      category: 'Mobile Development',
      startingPrice: 15000,
      deliveryTime: 14,
      status: 'Active'
    },
    {
      id: '6',
      image: 'assets/client.jpeg',
      title: 'I will optimize your website for SEO',
      category: 'Digital Marketing',
      startingPrice: 2500,
      deliveryTime: 3,
      status: 'Active'
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

  getStatusClass(status: string): string {
    return status.toLowerCase();
  }

  editGig(gig: Gig): void {
    console.log('Edit gig:', gig.title);
    alert(`Edit: ${gig.title}`);
  }

  deleteGig(gig: Gig): void {
    if (confirm(`Are you sure you want to delete "${gig.title}"?`)) {
      this.gigs = this.gigs.filter(g => g.id !== gig.id);
    }
  }

  viewGig(gig: Gig): void {
    console.log('View gig:', gig.title);
    alert(`View: ${gig.title}`);
  }

  createNewGig(): void {
    console.log('Create new gig');
    this.router.navigate(['/create-gig']);
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

  goToMessages(): void {
    this.router.navigate(['/freelancer-messages']);
  }

  goToProjects(): void {
    this.router.navigate(['/my-projects']);
  }

  goToEarnings(): void {
    this.router.navigate(['/freelancer-earnings']);
  }
}

