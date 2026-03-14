import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ProjectService, BackendProposal } from '../../../services/project.service';
import { inject } from '@angular/core';

interface ProposalWithProject {
  _id: string;
  projectId: string;
  projectTitle: string;
  proposedBudget: number;
  deliveryTime: number;
  status: string;
  createdAt: string;
  freelancerName: string;
  projectBudget: number;
  clientName: string;
}

@Component({
  selector: 'app-my-proposals',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-container">
      <!-- Sidebar - same as other dashboard pages -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <img src="assets/skillzyy-logo.png" alt="Skillzyy Logo" class="logo" (click)="goToDashboard()">
          <span class="brand-name" (click)="goToDashboard()">Skillzyy</span>
        </div>
        
        <nav class="sidebar-nav">
          <a class="nav-item" (click)="goToDashboard()">
            <i class="fas fa-th-large"></i>
            <span>Dashboard</span>
          </a>
          <a class="nav-item" (click)="goToFindJobs()">
            <i class="fas fa-search"></i>
            <span>Find Jobs</span>
          </a>
          <a class="nav-item active">
            <i class="fas fa-file-alt"></i>
            <span>My Proposals</span>
          </a>
          <a class="nav-item" (click)="goToMyGigs()">
            <i class="fas fa-briefcase"></i>
            <span>My Gigs</span>
          </a>
          <a class="nav-item" (click)="goToMessages()">
            <i class="fas fa-envelope"></i>
            <span>Messages</span>
          </a>
          <a class="nav-item" (click)="goToProjects()">
            <i class="fas fa-folder"></i>
            <span>Projects</span>
          </a>
          <a class="nav-item" (click)="goToEarnings()">
            <i class="fas fa-chart-line"></i>
            <span>Earnings</span>
          </a>
          <a class="nav-item" (click)="goToProfile()">
            <i class="fas fa-user"></i>
            <span>Profile</span>
          </a>
          <a class="nav-item" (click)="goToSettings()">
            <i class="fas fa-cog"></i>
            <span>Settings</span>
          </a>
        </nav>
        
        <div class="sidebar-footer">
          <button class="logout-btn" (click)="logout()">
            <i class="fas fa-sign-out-alt"></i>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main class="main-content">
        <div class="content-section">
          <div class="page-header">
            <h1>My Proposals</h1>
            <p>Track the status of your submitted proposals</p>
          </div>

          <div class="card">
            <div class="table-header">
              <h3>Proposals ({{ proposals.length }})</h3>
            </div>
            
            <div class="table-container">
              <table class="proposals-table" *ngIf="proposals.length > 0">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Proposed Budget</th>
                    <th>Delivery Time</th>
                    <th>Status</th>
                    <th>Date Submitted</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let proposal of proposals">
                    <td>
                      <div class="proposal-project">
                        <h4>{{ proposal.projectTitle }}</h4>
                        <span class="client-name">{{ proposal.clientName }}</span>
                      </div>
                    </td>
                    <td>₹{{ proposal.proposedBudget | number }}</td>
                    <td>{{ proposal.deliveryTime }} days</td>
                    <td>
                      <span class="status-badge" [ngClass]="getStatusClass(proposal.status)">
                        {{ getStatusLabel(proposal.status) }}
                      </span>
                    </td>
                    <td>{{ getFormattedDate(proposal.createdAt) }}</td>
                    <td>
                      <button class="btn-small" *ngIf="proposal.status === 'pending'" (click)="deleteProposal(proposal._id)">
                        <i class="fas fa-trash"></i> Delete
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div class="empty-state" *ngIf="proposals.length === 0">
                <i class="fas fa-file-alt"></i>
                <h4>No Proposals Submitted</h4>
                <p>You haven't submitted any proposals yet. <a href="/find-jobs" routerLink="/find-jobs">Browse jobs</a> to get started.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    /* Reuse dashboard styles, add proposal table styles */
    .proposals-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    }

    .proposals-table th {
      background: #f8f9fa;
      padding: 16px 20px;
      text-align: left;
      font-weight: 600;
      color: #333;
      font-size: 14px;
      border-bottom: 1px solid #eee;
    }

    .proposals-table td {
      padding: 16px 20px;
      border-bottom: 1px solid #f0f0f0;
      vertical-align: top;
    }

    .proposals-table tr:hover {
      background: #f8f9fa;
    }

    .proposal-project {
      margin: 0;
    }

    .proposal-project h4 {
      margin: 0 0 4px 0;
      font-size: 15px;
      color: #1a5c3a;
      font-weight: 600;
    }

    .client-name {
      font-size: 13px;
      color: #666;
    }

    .status-badge {
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
    }

    .status-badge.pending {
      background: #fff3cd;
      color: #856404;
    }

    .status-badge.accepted {
      background: #d4edda;
      color: #155724;
    }

    .status-badge.rejected {
      background: #f8d7da;
      color: #721c24;
    }

    .btn-small {
      padding: 8px 16px;
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      transition: background 0.3s;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .btn-small:hover {
      background: #c82333;
    }

    .table-header {
      padding-bottom: 20px;
      border-bottom: 1px solid #eee;
      margin-bottom: 20px;
    }

    .table-header h3 {
      margin: 0;
      color: #1a5c3a;
      font-size: 20px;
    }
  `]
})
export class MyProposalsComponent implements OnInit {
  proposals: ProposalWithProject[] = [];
  userId: string = '';

  route = inject(ActivatedRoute);
  projectService = inject(ProjectService);
  router = inject(Router);

  ngOnInit(): void {
    const userDataStr = sessionStorage.getItem('userData') || localStorage.getItem('userData');
    if (userDataStr) {
      const userData = JSON.parse(userDataStr);
      this.userId = userData._id || userData.id;
      const resolvedProposals = (this.route.snapshot.data['proposals'] || []) as BackendProposal[];
      this.proposals = resolvedProposals.map((p: BackendProposal) => ({
        ...p,
        projectTitle: p.projectTitle,
        projectBudget: p.proposedBudget,
        clientName: (p.clientName || 'Client') as string
      }));
    } else {
      this.router.navigate(['/login']);
    }
  }

  loadProposals(): void {
    this.projectService.getFreelancerProposals(this.userId).subscribe({
      next: (proposals: BackendProposal[]) => {
        this.proposals = proposals.map((p: BackendProposal) => ({
          ...p,
          projectTitle: p.projectTitle,
          projectBudget: p.proposedBudget,
          clientName: (p.clientName || 'Client') as string
        }));
      },
      error: (error: any) => console.error('Error loading proposals:', error)
    });
  }

  getStatusClass(status: string): string {
    return status || 'pending';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'pending': 'Pending',
      'accepted': 'Accepted',
      'rejected': 'Rejected'
    };
    return labels[status] || status;
  }

  getFormattedDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  deleteProposal(proposalId: string): void {
    if (confirm('Are you sure you want to delete this proposal?')) {
      // Call delete API
      console.log('Deleting proposal', proposalId);
      // Refresh list
      this.loadProposals();
    }
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

  goToMessages(): void {
    this.router.navigate(['/freelancer-messages']);
  }

  goToProjects(): void {
    this.router.navigate(['/my-projects']);
  }

  goToEarnings(): void {
    this.router.navigate(['/freelancer-earnings']);
  }

  goToProfile(): void {
    this.router.navigate(['/freelancer-profile']);
  }

  goToSettings(): void {
    this.router.navigate(['/freelancer-settings']);
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    this.router.navigate(['/login']);
  }
}

