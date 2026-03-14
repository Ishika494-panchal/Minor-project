import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Freelancer' | 'Client' | 'Admin';
  status: 'Active' | 'Suspended' | 'Blocked';
  joinedDate: string;
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
  
  // Mock data
  users: User[] = [
    {
      id: 'U1023',
      name: 'Rahul Sharma',
      email: 'rahul@gmail.com',
      role: 'Freelancer',
      status: 'Active',
      joinedDate: '12 March 2026'
    },
    {
      id: 'U1024',
      name: 'Priya Patel',
      email: 'priya@gmail.com',
      role: 'Client',
      status: 'Active',
      joinedDate: '15 February 2026'
    },
    {
      id: 'U1025',
      name: 'Aman Gupta',
      email: 'aman@gmail.com',
      role: 'Freelancer',
      status: 'Blocked',
      joinedDate: '20 March 2026'
    },
    {
      id: 'U1026',
      name: 'Neha Verma',
      email: 'neha@gmail.com',
      role: 'Client',
      status: 'Active',
      joinedDate: '5 January 2026'
    },
    {
      id: 'U1027',
      name: 'Admin User',
      email: 'admin@skillzyy.com',
      role: 'Admin',
      status: 'Active',
      joinedDate: '1 January 2025'
    },
    {
      id: 'U1028',
      name: 'Sanjay Kumar',
      email: 'sanjay@gmail.com',
      role: 'Freelancer',
      status: 'Suspended',
      joinedDate: '10 March 2026'
    },
    {
      id: 'U1029',
      name: 'Anjali Singh',
      email: 'anjali@gmail.com',
      role: 'Client',
      status: 'Active',
      joinedDate: '18 March 2026'
    },
    {
      id: 'U1030',
      name: 'Vikram Malhotra',
      email: 'vikram@gmail.com',
      role: 'Freelancer',
      status: 'Active',
      joinedDate: '22 March 2026'
    },
    {
      id: 'U1031',
      name: 'Pooja Reddy',
      email: 'pooja@gmail.com',
      role: 'Client',
      status: 'Blocked',
      joinedDate: '25 February 2026'
    },
    {
      id: 'U1032',
      name: 'Arjun Kapoor',
      email: 'arjun@gmail.com',
      role: 'Freelancer',
      status: 'Active',
      joinedDate: '1 April 2026'
    },
    {
      id: 'U1033',
      name: 'Riya Sharma',
      email: 'riya@gmail.com',
      role: 'Client',
      status: 'Suspended',
      joinedDate: '5 April 2026'
    },
    {
      id: 'U1034',
      name: 'Kunal Patel',
      email: 'kunal@gmail.com',
      role: 'Freelancer',
      status: 'Active',
      joinedDate: '8 April 2026'
    }
  ];

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
  statusOptions: string[] = ['All', 'Active', 'Suspended', 'Blocked'];

  // Edit user modal
  showEditModal: boolean = false;
  editingUser: User | null = null;
  editForm: User = {
    id: '',
    name: '',
    email: '',
    role: 'Client',
    status: 'Active',
    joinedDate: ''
  };

  // Math helper for template
  Math = Math;

  constructor(
    private router: Router
  ) {}

  ngOnInit(): void {
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
      this.filteredUsers = [...this.users];
      this.calculatePagination();
    } else {
      this.router.navigate(['/login']);
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
    alert(`Viewing profile for ${user.name} (${user.id})\n\nEmail: ${user.email}\nRole: ${user.role}\nStatus: ${user.status}\nJoined: ${user.joinedDate}`);
  }

  // Open edit modal
  openEditModal(user: User): void {
    this.editingUser = user;
    this.editForm = { ...user };
    this.showEditModal = true;
  }

  // Close edit modal
  closeEditModal(): void {
    this.showEditModal = false;
    this.editingUser = null;
  }

  // Save user edits
  saveUser(): void {
    if (this.editingUser) {
      const index = this.users.findIndex(u => u.id === this.editingUser!.id);
      if (index !== -1) {
        this.users[index] = { ...this.editForm };
        this.searchUsers();
      }
      this.closeEditModal();
    }
  }

  // Suspend user
  suspendUser(user: User): void {
    if (confirm(`Are you sure you want to suspend ${user.name}?`)) {
      const index = this.users.findIndex(u => u.id === user.id);
      if (index !== -1) {
        this.users[index].status = 'Suspended';
        this.searchUsers();
      }
    }
  }

  // Activate/reactivate user
  activateUser(user: User): void {
    if (confirm(`Are you sure you want to activate ${user.name}'s account?`)) {
      const index = this.users.findIndex(u => u.id === user.id);
      if (index !== -1) {
        this.users[index].status = 'Active';
        this.searchUsers();
      }
    }
  }

  // Block user
  blockUser(user: User): void {
    if (confirm(`Are you sure you want to block ${user.name}?`)) {
      const index = this.users.findIndex(u => u.id === user.id);
      if (index !== -1) {
        this.users[index].status = 'Blocked';
        this.searchUsers();
      }
    }
  }

  // Delete user
  deleteUser(user: User): void {
    if (confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
      this.users = this.users.filter(u => u.id !== user.id);
      this.searchUsers();
    }
  }

  // Logout
  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    this.router.navigate(['/login']);
  }
}

