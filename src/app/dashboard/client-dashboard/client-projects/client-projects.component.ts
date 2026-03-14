import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
// User type from models - import path resolved
interface User {
  id?: string;
  _id?: string;
  fullName: string;
  email: string;
  role: 'freelancer' | 'client' | 'admin';
}
import { PaymentService } from '../../../services/payment.service';
import { ProjectService, BackendProject } from '../../../services/project.service';

declare var Razorpay: any;

export interface ClientProject {
  _id: string;
  title: string;
  description: string;
  freelancer?: string;
  freelancerId?: string;
  budget: number;
  deadline: string;
  status: 'pending' | 'booked' | 'working' | 'submitted';
  paymentStatus?: 'Pending' | 'Paid';
  clientName?: string;
  submissionHostedLink?: string;
  submissionCodeFileName?: string;
}

@Component({
  selector: 'app-client-projects',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './client-projects.component.html',
  styleUrls: ['./client-projects.component.css']
})
export class ClientProjectsComponent implements OnInit {
  userData: User | null = null;
  projects: ClientProject[] = [];
  selectedProject: ClientProject | null = null;
  showProjectDetails: boolean = false;
  isLoading = false;
  processingPaymentProjectId = '';
  infoMessage = '';
  private paidProjectIds = new Set<string>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private paymentService: PaymentService,
    private projectService: ProjectService
  ) {}

  ngOnInit(): void {
    if (!this.hasAuthToken()) {
      this.router.navigate(['/login']);
      return;
    }

    this.userData = this.getStoredUser();
    const resolvedProjects = (this.route.snapshot.data['projects'] || []) as BackendProject[];
    this.bindProjects(resolvedProjects);
    this.loadPaidProjectsState();
    this.infoMessage = this.projects.length ? '' : 'No projects found for this client account yet.';
    this.isLoading = false;
    this.syncCurrentUserInBackground();
  }

  private getStoredUser(): User | null {
    try {
      const raw = sessionStorage.getItem('userData') || localStorage.getItem('userData');
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }

  private hasAuthToken(): boolean {
    const rawToken = sessionStorage.getItem('authToken') || localStorage.getItem('authToken') || '';
    const token = rawToken.replace(/^"(.*)"$/, '$1').trim();
    return !!token;
  }

  private syncCurrentUserInBackground(): void {
    this.projectService.getCurrentUser().subscribe({
      next: (response) => {
        const currentUser = response.user as User | undefined;
        if (!currentUser) {
          return;
        }

        if (String(currentUser.role || '').toLowerCase() !== 'client') {
          this.infoMessage = 'This page is only for client accounts.';
          this.projects = [];
          this.isLoading = false;
          return;
        }

        this.userData = currentUser;
        sessionStorage.setItem('userData', JSON.stringify(currentUser));
        localStorage.setItem('userData', JSON.stringify(currentUser));
        this.loadPaidProjectsState();
      },
      error: () => {
        // Non-blocking on purpose: projects API call already handles auth failures.
      }
    });
  }

  loadProjects(): void {
    this.isLoading = true;
    this.projectService.getMyClientProjects().subscribe({
      next: (projects: BackendProject[]) => {
        this.bindProjects(projects);
        this.loadPaidProjectsState();
        this.infoMessage = this.projects.length ? '' : 'No projects found for this client account yet.';
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading projects:', error);
      this.projects = [];
      this.isLoading = false;
      this.infoMessage = 'Could not load your projects.';
        if (String(error?.message || '').includes('401')) {
          this.router.navigate(['/login']);
        }
      }
    });
  }

  private bindProjects(projects: BackendProject[]): void {
    this.projects = projects.map(p => ({
      _id: p._id,
      title: p.title,
      description: p.description,
      budget: p.budget,
      deadline: p.deadline,
      status: this.toClientStatus(p),
      freelancer: p.assignedFreelancerName || 'Pending',
      freelancerId: p.assignedFreelancerId || undefined,
      paymentStatus:
        this.paidProjectIds.has(String(p._id)) ||
        p.status === 'In Progress' ||
        p.status === 'Completed'
          ? 'Paid'
          : 'Pending',
      submissionHostedLink: p.submissionHostedLink || '',
      submissionCodeFileName: p.submissionCodeFileName || ''
    }));
  }

  private loadPaidProjectsState(): void {
    const clientId = this.userData?.id || this.userData?._id;
    if (!clientId) {
      return;
    }

    this.paymentService.getPayments(clientId, 'client').subscribe({
      next: (response) => {
        const payments = response?.payments || [];
        this.paidProjectIds = new Set(
          payments
            .filter((p: any) => String(p?.status) === 'Completed')
            .map((p: any) => String(p?.projectId?._id || p?.projectId || ''))
            .filter((id: string) => !!id)
        );
        this.projects = this.projects.map((project) => ({
          ...project,
          paymentStatus: this.paidProjectIds.has(project._id) ? 'Paid' : project.paymentStatus || 'Pending'
        }));
      },
      error: () => {
        // Keep existing UI state if payments API fails.
      }
    });
  }

  private toClientStatus(project: BackendProject): ClientProject['status'] {
    if (project.status === 'Submitted' || project.status === 'Completed') {
      return 'submitted';
    }

    if (project.status === 'In Progress') {
      return 'working';
    }

    if (project.assignedFreelancerId || project.assignedFreelancerName) {
      return 'booked';
    }

    return 'pending';
  }

  viewProject(project: ClientProject): void {
    this.selectedProject = project;
    this.showProjectDetails = true;
  }

  closeProjectDetails(): void {
    this.showProjectDetails = false;
    this.selectedProject = null;
  }

  messageFreelancer(): void {
    if (this.selectedProject?.freelancerId) {
      this.router.navigate(['/client-messages'], {
        queryParams: {
          partnerId: this.selectedProject.freelancerId,
          partnerName: this.selectedProject.freelancer || 'Freelancer'
        }
      });
      return;
    }
    alert('Freelancer is not assigned yet.');
  }

  messageProjectFreelancer(project: ClientProject): void {
    if (!project.freelancerId) {
      alert('Freelancer is not assigned yet.');
      return;
    }

    this.router.navigate(['/client-messages'], {
      queryParams: {
        partnerId: project.freelancerId,
        partnerName: project.freelancer || 'Freelancer'
      }
    });
  }

  openHostedLink(project: ClientProject): void {
    const link = (project.submissionHostedLink || '').trim();
    if (!link) {
      alert('Freelancer has not uploaded hosted link yet.');
      return;
    }
    window.open(link, '_blank');
  }

  async initiatePayment(project: ClientProject): Promise<void> {
    if (this.isAnyPaymentInProgress() || !project.freelancerId) {
      alert('No freelancer assigned or payment in progress.');
      return;
    }

    this.processingPaymentProjectId = project._id;
    this.selectedProject = project;

    try {
      const response = await this.paymentService.createRazorpayOrder(
        project._id,
        project.budget
      ).toPromise();

      if (response?.success && response.order) {
        const paymentId = response.paymentId || '';
        const keyId = response.keyId || '';
        this.openRazorpayCheckout(response.order, project, paymentId, keyId);
      } else {
        this.processingPaymentProjectId = '';
        alert(response?.message || 'Failed to create payment order');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      this.processingPaymentProjectId = '';
      alert(error?.error?.message || error?.message || 'Failed to initiate payment');
    }
  }

  openRazorpayCheckout(order: any, project: ClientProject, paymentId: string, keyId: string): void {
    const options = {
      key: keyId || 'rzp_test_SQND7PBjAsvi8S',
      amount: order.amount,
      currency: order.currency || 'INR',
      name: 'Skillzyy',
      description: `Payment for ${project.title}`,
      image: 'assets/skillzyy-logo.png',
      order_id: order.id,
      handler: (response: any) => {
        this.verifyPayment(response, project, paymentId);
      },
      prefill: {
        name: this.userData?.fullName || 'Client',
        email: this.userData?.email || '',
      },
      theme: {
        color: '#4f46e5'
      },
      modal: {
        ondismiss: () => {
          this.processingPaymentProjectId = '';
          alert('Payment cancelled');
        }
      }
    };

    // @ts-ignore
    const rzp = new Razorpay(options);
    rzp.open();
  }

  async verifyPayment(razorpayResponse: any, project: ClientProject, paymentId: string): Promise<void> {
    try {
      const response = await this.paymentService.verifyPayment(
        razorpayResponse.razorpay_payment_id,
        razorpayResponse.razorpay_order_id,
        razorpayResponse.razorpay_signature,
        project._id,
        paymentId
      ).toPromise();

      if (response?.success) {
        this.paidProjectIds.add(project._id);
        this.projects = this.projects.map((item) =>
          item._id === project._id ? { ...item, paymentStatus: 'Paid' } : item
        );
        alert('Payment successful! The freelancer will receive the money in 2-3 working days by Skillzyy.');
        // Reload projects
        this.loadProjects();
      } else {
        alert(response?.message || 'Payment verification failed');
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      alert(error?.error?.message || error?.message || 'Failed to verify payment');
    } finally {
      this.processingPaymentProjectId = '';
    }
  }

  canPay(project: ClientProject): boolean {
    return project.status === 'submitted' && !!project.freelancerId && project.paymentStatus !== 'Paid';
  }

  isProcessingPayment(project: ClientProject): boolean {
    return this.processingPaymentProjectId === project._id;
  }

  isAnyPaymentInProgress(): boolean {
    return !!this.processingPaymentProjectId;
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    this.router.navigate(['/login']);
  }

  refreshProjects(): void {
    this.loadProjects();
  }
}

