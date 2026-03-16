import { ChangeDetectorRef, Component, HostListener, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AdminService } from '../../../services/admin.service';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Freelancer' | 'Client' | 'Admin';
  status: 'Active' | 'Suspended' | 'Blocked';
  joinedDate: string;
  skills?: string[];
  bio?: string;
  hourlyRate?: number;
}

@Component({
  selector: 'app-manage-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './manage-users.component.html',
  styleUrls: ['./manage-users.component.css']
})
export class ManageUsersComponent implements OnInit {
  userData: any = null;
  users: User[] = [];

  // Filtered users
  filteredUsers: User[] = [];

  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 5;
  totalPages: number = 1;

  // Search and filters
  searchTerm: string = '';
  roleFilter: string = 'All';
  statusFilter: string = 'All';

  // Role options for dropdown
  roleOptions: string[] = ['All', 'Freelancer', 'Client', 'Admin'];
  
  // Status options for dropdown
  statusOptions: string[] = ['All', 'Active', 'Blocked'];

  // Edit user modal
  showEditModal: boolean = false;
  showProfileModal: boolean = false;
  editingUser: User | null = null;
  selectedProfileUser: User | null = null;
  editForm: User = {
    id: '',
    name: '',
    email: '',
    role: 'Client',
    status: 'Active',
    joinedDate: '',
    bio: '',
    skills: [],
    hourlyRate: 0
  };

  // Math helper for template
  Math = Math;
  activeUserActionIds = new Set<string>();
  isSavingEdit = false;
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
      this.loadUsers();
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

  // Calculate pagination
  calculatePagination(): void {
    this.totalPages = Math.ceil(this.filteredUsers.length / this.itemsPerPage);
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }
  }

  // Get paginated users
  get paginatedUsers(): User[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredUsers.slice(startIndex, endIndex);
  }

  // Go to specific page
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  // Previous page
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  // Next page
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  // Search users
  searchUsers(): void {
    this.filteredUsers = this.users.filter(user => {
      const matchesSearch = !this.searchTerm || 
        user.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesRole = this.roleFilter === 'All' || user.role === this.roleFilter;
      
      const matchesStatus = this.statusFilter === 'All' || user.status === this.statusFilter;
      
      return matchesSearch && matchesRole && matchesStatus;
    });
    this.currentPage = 1;
    this.calculatePagination();
  }

  // Filter by role
  filterByRole(): void {
    this.searchUsers();
  }

  // Filter by status
  filterByStatus(): void {
    this.searchUsers();
  }

  // View user profile
  viewProfile(user: User): void {
    this.ngZone.run(() => {
      this.selectedProfileUser = user;
      this.showProfileModal = true;
      this.cdr.detectChanges();
    });
  }

  closeProfileModal(): void {
    this.ngZone.run(() => {
      this.showProfileModal = false;
      this.selectedProfileUser = null;
      this.cdr.detectChanges();
    });
  }

  // Open edit modal
  openEditModal(user: User): void {
    this.ngZone.run(() => {
      this.editingUser = user;
      this.editForm = { ...user };
      this.showEditModal = true;
      this.cdr.detectChanges();
    });
  }

  // Close edit modal
  closeEditModal(): void {
    this.ngZone.run(() => {
      this.showEditModal = false;
      this.editingUser = null;
      this.isSavingEdit = false;
      this.cdr.detectChanges();
    });
  }

  // Save user edits
  saveUser(): void {
    if (this.editingUser && !this.isSavingEdit) {
      const editingUserId = this.editingUser.id;
      this.isSavingEdit = true;
      const previousUser = this.users.find((u) => u.id === editingUserId);
      const optimisticUser = {
        ...(previousUser || this.editForm),
        name: this.editForm.name,
        bio: this.editForm.bio || '',
        skills: this.editForm.skills || [],
        hourlyRate: Number(this.editForm.hourlyRate || 0)
      } as User;

      this.users = this.users.map((u) => (u.id === editingUserId ? optimisticUser : u));
      this.searchUsers();
      this.cdr.detectChanges();

      this.adminService.updateUserProfileByAdmin(editingUserId, {
        fullName: this.editForm.name,
        bio: this.editForm.bio || '',
        skills: this.editForm.skills || [],
        hourlyRate: Number(this.editForm.hourlyRate || 0)
      }).subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.isSavingEdit = false;
            this.closeEditModal();
            this.loadUsers();
          });
        },
        error: (error) => {
          this.ngZone.run(() => {
            if (previousUser) {
              this.users = this.users.map((u) => (u.id === editingUserId ? previousUser : u));
              this.searchUsers();
            }
            this.isSavingEdit = false;
            this.cdr.detectChanges();
          });
          alert(error?.error?.message || 'Failed to update user');
        }
      });
    }
  }

  // Suspend user
  suspendUser(user: User): void {
    if (this.activeUserActionIds.has(user.id)) return;
    if (confirm(`Are you sure you want to block ${user.name}?`)) {
      this.activeUserActionIds.add(user.id);
      this.setUserStatusLocal(user.id, 'Blocked');
      this.adminService.updateUserStatus(user.id, 'Blocked').subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.activeUserActionIds.delete(user.id);
            this.cdr.detectChanges();
            this.loadUsers();
          });
        },
        error: (error) => {
          this.ngZone.run(() => {
            this.activeUserActionIds.delete(user.id);
            this.setUserStatusLocal(user.id, user.status);
            this.cdr.detectChanges();
          });
          alert(error?.error?.message || 'Failed to block user');
        }
      });
    }
  }

  // Activate/reactivate user
  activateUser(user: User): void {
    if (this.activeUserActionIds.has(user.id)) return;
    if (confirm(`Are you sure you want to activate ${user.name}'s account?`)) {
      this.activeUserActionIds.add(user.id);
      this.setUserStatusLocal(user.id, 'Active');
      this.adminService.updateUserStatus(user.id, 'Active').subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.activeUserActionIds.delete(user.id);
            this.cdr.detectChanges();
            this.loadUsers();
          });
        },
        error: (error) => {
          this.ngZone.run(() => {
            this.activeUserActionIds.delete(user.id);
            this.setUserStatusLocal(user.id, user.status);
            this.cdr.detectChanges();
          });
          alert(error?.error?.message || 'Failed to activate user');
        }
      });
    }
  }

  // Block user
  blockUser(user: User): void {
    if (this.activeUserActionIds.has(user.id)) return;
    if (confirm(`Are you sure you want to block ${user.name}?`)) {
      this.activeUserActionIds.add(user.id);
      this.setUserStatusLocal(user.id, 'Blocked');
      this.adminService.updateUserStatus(user.id, 'Blocked').subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.activeUserActionIds.delete(user.id);
            this.cdr.detectChanges();
            this.loadUsers();
          });
        },
        error: (error) => {
          this.ngZone.run(() => {
            this.activeUserActionIds.delete(user.id);
            this.setUserStatusLocal(user.id, user.status);
            this.cdr.detectChanges();
          });
          alert(error?.error?.message || 'Failed to block user');
        }
      });
    }
  }

  // Delete user
  deleteUser(user: User): void {
    if (this.activeUserActionIds.has(user.id)) return;
    if (confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
      this.activeUserActionIds.add(user.id);
      const previousUsers = [...this.users];
      this.users = this.users.filter((u) => u.id !== user.id);
      this.searchUsers();
      this.cdr.detectChanges();

      this.adminService.deleteUser(user.id).subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.activeUserActionIds.delete(user.id);
            this.cdr.detectChanges();
            this.loadUsers();
          });
        },
        error: (error) => {
          this.ngZone.run(() => {
            this.users = previousUsers;
            this.searchUsers();
            this.activeUserActionIds.delete(user.id);
            this.cdr.detectChanges();
          });
          alert(error?.error?.message || 'Failed to delete user');
        }
      });
    }
  }

  private loadUsers(): void {
    const role = this.roleFilter === 'All' ? '' : this.roleFilter.toLowerCase();
    this.adminService.getUsers(role, this.searchTerm.trim()).subscribe({
      next: (response) => {
        this.ngZone.run(() => {
          const users = Array.isArray(response?.users) ? response.users : [];
          this.users = users.map((u: any) => ({
            id: String(u.id),
            name: u.fullName || '',
            email: u.email || '',
            role: String(u.role || 'client').charAt(0).toUpperCase() + String(u.role || 'client').slice(1) as User['role'],
            status: (u.accountStatus || 'Active') as User['status'],
            joinedDate: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '',
            skills: Array.isArray(u.skills) ? u.skills : [],
            bio: u.bio || '',
            hourlyRate: Number(u.hourlyRate || 0)
          }));
          this.searchUsers();
          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        console.error('Failed to load users', error);
      }
    });
  }

  isUserActionInProgress(userId: string): boolean {
    return this.activeUserActionIds.has(userId);
  }

  private setUserStatusLocal(userId: string, status: User['status']): void {
    this.users = this.users.map((u) => (u.id === userId ? { ...u, status } : u));
    this.searchUsers();
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

