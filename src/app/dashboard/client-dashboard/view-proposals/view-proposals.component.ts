import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProjectService, BackendProposal } from '../../../services/project.service';

@Component({
  selector: 'app-view-proposals',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './view-proposals.component.html',
  styleUrls: ['./view-proposals.component.css']
})
export class ViewProposalsComponent implements OnInit {
  userData: any = null;
  proposals: BackendProposal[] = [];
  selectedProjectId: string = '';
  isLoading = false;
  errorMessage = '';

  // Notification dropdown
  showNotifications = false;
  notificationsList: any[] = [];

  // Profile dropdown
  showProfileMenu = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectService: ProjectService
  ) {}

  ngOnInit(): void {
    const userDataStr = sessionStorage.getItem('userData') || localStorage.getItem('userData');
    if (userDataStr) {
      this.userData = JSON.parse(userDataStr);
      const resolvedProposals = (this.route.snapshot.data['proposals'] || []) as BackendProposal[];
      this.proposals = resolvedProposals.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      this.isLoading = false;
    } else {
      this.router.navigate(['/login']);
    }
  }

  viewProfile(freelancerId: string): void {
    // Navigate to freelancer profile
    alert(`Viewing profile of freelancer: ${freelancerId}`);
  }

  acceptProposal(proposal: BackendProposal): void {
    this.updateProposalStatus(proposal, 'accepted');
  }

  rejectProposal(proposal: BackendProposal): void {
    this.updateProposalStatus(proposal, 'rejected');
  }

  getStatusLabel(status: BackendProposal['status']): string {
    const labels: Record<BackendProposal['status'], string> = {
      pending: 'Pending',
      accepted: 'Accepted',
      rejected: 'Rejected'
    };
    return labels[status] || status;
  }

  private updateProposalStatus(proposal: BackendProposal, status: 'accepted' | 'rejected'): void {
    this.projectService.updateProposalStatus(proposal._id, status).subscribe({
      next: () => {
        this.proposals = this.proposals.map((p) => {
          if (p._id === proposal._id) {
            return { ...p, status };
          }
          // Keep UI in sync with backend behavior when a proposal is accepted.
          if (status === 'accepted' && p.projectId === proposal.projectId) {
            return { ...p, status: 'rejected' };
          }
          return p;
        });
      },
      error: (error) => {
        this.errorMessage = error.message || 'Failed to update proposal status.';
      }
    });
  }

  // Toggle notification dropdown
  toggleNotifications(event: Event): void {
    event.stopPropagation();
    this.showNotifications = !this.showNotifications;
    this.showProfileMenu = false;
  }

  // Toggle profile dropdown
  toggleProfileMenu(event: Event): void {
    event.stopPropagation();
    this.showProfileMenu = !this.showProfileMenu;
    this.showNotifications = false;
  }

  // Close dropdowns when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-wrapper') && !target.closest('.profile-wrapper')) {
      this.showNotifications = false;
      this.showProfileMenu = false;
    }
  }

  // Mark all notifications as read
  markAllAsRead(): void {
    this.notificationsList.forEach((n: any) => n.read = true);
  }

  // Navigate to profile
  goToProfile(): void {
    this.router.navigate(['/client-profile']);
    this.showProfileMenu = false;
  }

  // Navigate to settings
  goToSettings(): void {
    this.router.navigate(['/client-settings']);
    this.showProfileMenu = false;
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    this.router.navigate(['/login']);
  }
}

