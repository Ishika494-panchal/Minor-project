import { ChangeDetectorRef, Component, HostListener, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AdminService } from '../../../services/admin.service';

export interface Project {
  id: string;
  projectId: string;
  title: string;
  clientName: string;
  assignedFreelancer: string;
  budget: number;
  status: 'Open' | 'In Progress' | 'Completed' | 'Cancelled';
  postedDate: string;
}

export interface ServiceItem {
  id: string;
  title: string;
  category: string;
  freelancerName: string;
  price: number;
  deliveryDays: number;
  status: 'Active' | 'Paused' | 'Draft' | 'Deleted';
  createdAt: string;
}

@Component({
  selector: 'app-admin-projects',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-projects.component.html',
  styleUrls: ['./admin-projects.component.css']
})
export class AdminProjectsComponent implements OnInit {
  userData: any = null;
  activeTab: 'orders' | 'services' = 'orders';
  projects: Project[] = [];
  services: ServiceItem[] = [];

  // Filtered projects
  filteredProjects: Project[] = [];
  filteredServices: ServiceItem[] = [];

  // Search and filter
  searchTerm: string = '';
  statusFilter: string = 'All';
  serviceStatusFilter: string = 'All';

  // Status options for dropdown
  statusOptions: string[] = ['All', 'Open', 'In Progress', 'Submitted', 'Completed', 'Cancelled'];
  serviceStatusOptions: string[] = ['All', 'Active', 'Paused', 'Draft', 'Deleted'];
  activeServiceActionId: string | null = null;
  isMobileOrTablet = false;
  isSidebarOpen = false;

  constructor(
    private router: Router,
    private adminService: AdminService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.updateViewportState();
    const userDataStr = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    if (userDataStr) {
      this.userData = JSON.parse(userDataStr);
      // Check if user is admin
      if (this.userData.role !== 'admin') {
        if (this.userData.role === 'client') {
          this.router.navigate(['/client-dashboard']);
        } else if (this.userData.role === 'freelancer') {
          this.router.navigate(['/freelancer-dashboard']);
        } else {
          this.router.navigate(['/login']);
        }
        return;
      }
      this.loadOrders();
      this.loadServices();
    } else {
      this.router.navigate(['/login']);
    }
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

  toggleSidebar(event?: Event): void {
    event?.stopPropagation();
    if (!this.isMobileOrTablet) return;
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar(): void {
    if (this.isMobileOrTablet) {
      this.isSidebarOpen = false;
    }
  }

  // Search projects
  searchProjects(): void {
    this.filteredProjects = this.projects.filter(project => {
      const matchesSearch = !this.searchTerm || 
        project.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        project.clientName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        project.assignedFreelancer.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        project.projectId.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesStatus = this.statusFilter === 'All' || project.status === this.statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }

  setActiveTab(tab: 'orders' | 'services', event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.ngZone.run(() => {
      this.activeTab = tab;
      if (tab === 'orders') {
        this.searchProjects();
      } else {
        this.searchServices();
      }
      this.cdr.detectChanges();
    });
  }

  onSearchInput(): void {
    if (this.activeTab === 'orders') {
      this.searchProjects();
      return;
    }
    this.searchServices();
  }

  // Filter by status
  filterByStatus(): void {
    this.searchProjects();
  }

  searchServices(): void {
    this.filteredServices = this.services.filter((service) => {
      const matchesSearch =
        !this.searchTerm ||
        service.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        service.freelancerName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        service.category.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesStatus = this.serviceStatusFilter === 'All' || service.status === this.serviceStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }

  filterServicesByStatus(): void {
    this.searchServices();
  }

  // View project details
  viewProject(project: Project): void {
    alert(`Project: ${project.title}\nClient: ${project.clientName}\nFreelancer: ${project.assignedFreelancer}\nStatus: ${project.status}`);
  }

  // Suspend project
  suspendProject(project: Project): void {
    if (confirm(`Are you sure you want to suspend project ${project.projectId}?`)) {
      alert('Use client workflow to change project lifecycle. Admin monitoring only.');
    }
  }

  // Delete project
  deleteProject(project: Project): void {
    if (confirm(`Are you sure you want to delete project ${project.projectId}? This action cannot be undone.`)) {
      alert('Project deletion from admin is intentionally restricted.');
    }
  }

  viewService(service: ServiceItem): void {
    alert(`Service: ${service.title}\nFreelancer: ${service.freelancerName}\nStatus: ${service.status}\nPrice: ${this.formatBudget(service.price)}`);
  }

  approveService(service: ServiceItem): void {
    this.updateServiceStatus(service, 'Active');
  }

  rejectService(service: ServiceItem): void {
    this.updateServiceStatus(service, 'Deleted');
  }

  pauseService(service: ServiceItem): void {
    this.updateServiceStatus(service, 'Paused');
  }

  editService(service: ServiceItem): void {
    const title = prompt('Update service title', service.title)?.trim();
    if (!title) return;
    const priceRaw = prompt('Update service price', String(service.price))?.trim();
    const deliveryRaw = prompt('Update delivery days', String(service.deliveryDays))?.trim();
    const price = Number(priceRaw || service.price);
    const deliveryDays = Number(deliveryRaw || service.deliveryDays);

    this.activeServiceActionId = service.id;

    // Optimistic UI update to avoid delayed visual feedback.
    const previousService = { ...service };
    this.services = this.services.map((item) =>
      item.id === service.id
        ? {
            ...item,
            title,
            price: Number.isFinite(price) ? price : item.price,
            deliveryDays: Number.isFinite(deliveryDays) ? deliveryDays : item.deliveryDays
          }
        : item
    );
    this.searchServices();
    this.cdr.detectChanges();

    this.adminService.updateService(service.id, {
      title,
      price: Number.isFinite(price) ? price : service.price,
      deliveryDays: Number.isFinite(deliveryDays) ? deliveryDays : service.deliveryDays
    }).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.activeServiceActionId = null;
          this.cdr.detectChanges();
          this.loadServices();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
          this.services = this.services.map((item) => (item.id === service.id ? previousService : item));
          this.searchServices();
          this.activeServiceActionId = null;
          this.cdr.detectChanges();
        });
        alert(error?.error?.message || 'Failed to update service');
      }
    });
  }

  private updateServiceStatus(service: ServiceItem, status: ServiceItem['status']): void {
    this.activeServiceActionId = service.id;
    const previousStatus = service.status;

    // Optimistic status update on first click.
    this.services = this.services.map((item) =>
      item.id === service.id ? { ...item, status } : item
    );
    this.searchServices();
    this.cdr.detectChanges();

    this.adminService.updateServiceStatus(service.id, status).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.activeServiceActionId = null;
          this.cdr.detectChanges();
          this.loadServices();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
          this.services = this.services.map((item) =>
            item.id === service.id ? { ...item, status: previousStatus } : item
          );
          this.searchServices();
          this.activeServiceActionId = null;
          this.cdr.detectChanges();
        });
        alert(error?.error?.message || 'Failed to update service');
      }
    });
  }

  // Format budget with rupee symbol
  formatBudget(budget: number): string {
    return '₹' + budget.toLocaleString('en-IN');
  }

  private loadOrders(): void {
    this.adminService.getOrders().subscribe({
      next: (response) => {
        this.ngZone.run(() => {
          const orders = Array.isArray(response?.orders) ? response.orders : [];
          this.projects = orders.map((order: any, index: number) => ({
            id: String(order.id),
            projectId: `ORD-${index + 1}`,
            title: order.title || '',
            clientName: order.clientName || 'Client',
            assignedFreelancer: order.assignedFreelancerName || 'Unassigned',
            budget: Number(order.budget || 0),
            status: (order.status || 'Open') as Project['status'],
            postedDate: order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ''
          }));
          this.searchProjects();
          this.cdr.detectChanges();
        });
      },
      error: (error) => console.error('Failed to load orders', error)
    });
  }

  private loadServices(): void {
    this.adminService.getServices().subscribe({
      next: (response) => {
        this.ngZone.run(() => {
          const services = Array.isArray(response?.services) ? response.services : [];
          this.services = services.map((item: any) => ({
            id: String(item.id),
            title: item.title || '',
            category: item.category || '',
            freelancerName: item.freelancerName || 'Freelancer',
            price: Number(item.price || 0),
            deliveryDays: Number(item.deliveryDays || 0),
            status: (item.status || 'Draft') as ServiceItem['status'],
            createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''
          }));
          this.searchServices();
          this.cdr.detectChanges();
        });
      },
      error: (error) => console.error('Failed to load services', error)
    });
  }

  // Logout
  logout(): void {
    this.closeSidebar();
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    this.router.navigate(['/login']);
  }
}

