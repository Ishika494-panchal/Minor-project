import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { SignupComponent } from './signup/signup.component';
import { LandingComponent } from './landing/landing.component';
import { ClientDashboardComponent } from './dashboard/client-dashboard/client-dashboard.component';
import { ClientProjectsComponent } from './dashboard/client-dashboard/client-projects/client-projects.component';
import { ClientPaymentsComponent } from './dashboard/client-dashboard/client-payments/client-payments.component';
import { ClientProfileComponent } from './dashboard/client-dashboard/client-profile/client-profile.component';
import { ClientSettingsComponent } from './dashboard/client-dashboard/client-settings/client-settings.component';
import { FindFreelancersComponent } from './dashboard/client-dashboard/find-freelancers/find-freelancers.component';
import { ClientMessagesComponent } from './dashboard/client-dashboard/client-messages/client-messages.component';
import { AdminDashboardComponent } from './dashboard/admin-dashboard/admin-dashboard.component';
import { ManageUsersComponent } from './dashboard/admin-dashboard/manage-users/manage-users.component';
import { AdminProjectsComponent } from './dashboard/admin-dashboard/admin-projects/admin-projects.component';
import { AdminRevenueComponent } from './dashboard/admin-dashboard/admin-revenue/admin-revenue.component';
import { AdminMessagesComponent } from './dashboard/admin-dashboard/admin-messages/admin-messages.component';
import { AdminSecurityComponent } from './dashboard/admin-dashboard/admin-security/admin-security.component';
import { AdminSettingsComponent } from './dashboard/admin-dashboard/admin-settings/admin-settings.component';
import { FreelancerDashboardComponent } from './dashboard/freelancer-dashboard/freelancer-dashboard.component';
import { FindJobsComponent } from './dashboard/freelancer-dashboard/find-jobs/find-jobs.component';
import { MyGigsComponent } from './dashboard/freelancer-dashboard/my-gigs/my-gigs.component';
import { MyProjectsComponent } from './dashboard/freelancer-dashboard/my-projects/my-projects.component';
import { CreateGigComponent } from './dashboard/freelancer-dashboard/create-gig/create-gig.component';
import { FreelancerMessagesComponent } from './dashboard/freelancer-dashboard/freelancer-messages/freelancer-messages.component';
import { Messages } from './messages/messages';
import { PostProjectComponent } from './dashboard/client-dashboard/post-project/post-project.component';
import { ViewProposalsComponent } from './dashboard/client-dashboard/view-proposals/view-proposals.component';
import { PaymentHistoryComponent } from './dashboard/client-dashboard/payment-history/payment-history.component';
import { EarningsComponent } from './dashboard/freelancer-dashboard/earnings/earnings.component';
import { FreelancerProfileComponent } from './dashboard/freelancer-dashboard/freelancer-profile/freelancer-profile.component';
import { FreelancerSettingsComponent } from './dashboard/freelancer-dashboard/freelancer-settings/freelancer-settings.component';
import { MyProposalsComponent } from './dashboard/freelancer-dashboard/my-proposals/my-proposals.component';
import { clientProjectsResolver } from './resolvers/client-projects.resolver';
import { clientProposalsResolver } from './resolvers/client-proposals.resolver';
import { freelancerProjectsResolver } from './resolvers/freelancer-projects.resolver';
import { freelancerProposalsResolver } from './resolvers/freelancer-proposals.resolver';
import { freelancerFindJobsResolver } from './resolvers/freelancer-find-jobs.resolver';
import { freelancerEarningsResolver } from './resolvers/freelancer-earnings.resolver';

export const routes: Routes = [
  { path: '', redirectTo: '/landing', pathMatch: 'full' },
  { path: 'landing', component: LandingComponent },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'client-dashboard', component: ClientDashboardComponent },
  { path: 'client-projects', redirectTo: '/projects', pathMatch: 'full' },
  { path: 'projects', component: ClientProjectsComponent, resolve: { projects: clientProjectsResolver } },
  { path: 'client-payments', component: ClientPaymentsComponent },
  { path: 'client-profile', component: ClientProfileComponent },
  { path: 'client-settings', component: ClientSettingsComponent },
  { path: 'client-messages', component: ClientMessagesComponent },
  { path: 'find-freelancers', component: FindFreelancersComponent },
  { path: 'admin-dashboard', component: AdminDashboardComponent },
  { path: 'manage-users', component: ManageUsersComponent },
  { path: 'admin-projects', component: AdminProjectsComponent },
  { path: 'admin-revenue', component: AdminRevenueComponent },
  { path: 'admin-messages', component: AdminMessagesComponent },
  { path: 'admin-security', component: AdminSecurityComponent },
  { path: 'admin-settings', component: AdminSettingsComponent },
  { path: 'freelancer-dashboard', component: FreelancerDashboardComponent },
  { path: 'find-jobs', component: FindJobsComponent, resolve: { jobsData: freelancerFindJobsResolver } },
  { path: 'my-gigs', component: MyGigsComponent },
  { path: 'my-projects', component: MyProjectsComponent, resolve: { projects: freelancerProjectsResolver } },
  { path: 'create-gig', component: CreateGigComponent },
  { path: 'freelancer-messages', component: FreelancerMessagesComponent },
  { path: 'freelancer-earnings', component: EarningsComponent, resolve: { earningsPayments: freelancerEarningsResolver } },
  { path: 'freelancer-profile', component: FreelancerProfileComponent },
  { path: 'freelancer-settings', component: FreelancerSettingsComponent },
  { path: 'messages', component: Messages },
  { path: 'post-project', component: PostProjectComponent },
  { path: 'view-proposals', component: ViewProposalsComponent, resolve: { proposals: clientProposalsResolver } },
  { path: 'payment-history', component: PaymentHistoryComponent },
  { path: 'my-proposals', component: MyProposalsComponent, resolve: { proposals: freelancerProposalsResolver } },
  { path: '**', redirectTo: '/landing' }
];

