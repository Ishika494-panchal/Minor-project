import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

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

@Component({
  selector: 'app-admin-projects',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-projects.component.html',
  styleUrls: ['./admin-projects.component.css']
})
export class AdminProjectsComponent implements OnInit {
  userData: any = null;

  // Mock project data
  projects: Project[] = [
    {
      id: '1',
      projectId: 'P101',
      title: 'Website Development',
      clientName: 'Rahul Sharma',
      assignedFreelancer: 'Aman Gupta',
      budget: 12000,
      status: 'In Progress',
      postedDate: '10 March 2026'
    },
    {
      id: '2',
      projectId: 'P102',
      title: 'Mobile App Design',
      clientName: 'Priya Patel',
      assignedFreelancer: 'Sarah Johnson',
      budget: 8500,
      status: 'Open',
      postedDate: '12 March 2026'
    },
    {
      id: '3',
      projectId: 'P103',
      title: 'E-commerce Platform',
      clientName: 'TechCorp Solutions',
      assignedFreelancer: 'Michael Chen',
      budget: 25000,
      status: 'Completed',
      postedDate: '5 March 2026'
    },
    {
      id: '4',
      projectId: 'P104',
      title: 'Logo Design',
      clientName: 'Neha Verma',
      assignedFreelancer: 'Emily Davis',
      budget: 3000,
      status: 'Cancelled',
      postedDate: '15 March 2026'
    },
    {
      id: '5',
      projectId: 'P105',
      title: 'SEO Optimization',
      clientName: 'John Anderson',
      assignedFreelancer: 'Alex Rivera',
      budget: 5000,
      status: 'In Progress',
      postedDate: '8 March 2026'
    }
  ];

  // Filtered projects
  filteredProjects: Project[] = [];

  // Search and filter
  searchTerm: string = '';
  statusFilter: string = 'All';

  // Status options for dropdown
  statusOptions: string[] = ['All', 'Open', 'In Progress', 'Completed', 'Cancelled'];

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
      this.filteredProjects = [...this.projects];
    } else {
      this.router.navigate(['/login']);
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

  // Filter by status
  filterByStatus(): void {
    this.searchProjects();
  }

  // View project details
  viewProject(project: Project): void {
    alert(`Viewing project: ${project.title} (${project.projectId})`);
  }

  // Suspend project
  suspendProject(project: Project): void {
    if (confirm(`Are you sure you want to suspend project ${project.projectId}?`)) {
      const index = this.projects.findIndex(p => p.id === project.id);
      if (index !== -1) {
        if (project.status === 'Cancelled') {
          alert('Project is already cancelled');
        } else {
          this.projects[index].status = 'Cancelled';
          this.searchProjects();
        }
      }
    }
  }

  // Delete project
  deleteProject(project: Project): void {
    if (confirm(`Are you sure you want to delete project ${project.projectId}? This action cannot be undone.`)) {
      this.projects = this.projects.filter(p => p.id !== project.id);
      this.searchProjects();
    }
  }

  // Format budget with rupee symbol
  formatBudget(budget: number): string {
    return '₹' + budget.toLocaleString('en-IN');
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

