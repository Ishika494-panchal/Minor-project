import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// Interfaces
interface LoginActivity {
  id: string;
  userName: string;
  role: 'admin' | 'client' | 'freelancer';
  email: string;
  ipAddress: string;
  device: string;
  browser: string;
  loginTime: string;
  status: 'success' | 'failed';
}

interface SuspiciousActivity {
  id: string;
  type: 'multiple_failed_login' | 'unusual_location' | 'rapid_actions' | 'fraud_behavior';
  userName: string;
  userEmail: string;
  description: string;
  ipAddress: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high';
  status: 'pending' | 'investigated' | 'resolved';
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'moderator' | 'support';
  status: 'active' | 'inactive';
  lastLogin: string;
  permissions: string[];
}

interface SecurityLog {
  id: string;
  action: string;
  performedBy: string;
  targetUser?: string;
  details: string;
  timestamp: string;
  type: 'password_change' | 'account_lockout' | 'permission_update' | 'system_alert' | 'security_setting';
}

interface UserSecurity {
  id: string;
  name: string;
  email: string;
  role: 'client' | 'freelancer';
  isBlocked: boolean;
  is2FAEnabled: boolean;
  lastLogin: string;
  loginAttempts: number;
}

@Component({
  selector: 'app-admin-security',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-security.component.html',
  styleUrls: ['./admin-security.component.css']
})
export class AdminSecurityComponent implements OnInit {
  // User data
  userData: any = null;

  // Active tab
  activeTab: 'overview' | 'login_activity' | 'suspicious' | 'users' | 'admins' | '2fa' | 'logs' = 'overview';

  // Security Overview
  securityStats = {
    totalLoginAttempts: 0,
    failedLoginAttempts: 0,
    blockedUsers: 0,
    suspiciousActivities: 0,
    activeAdminSessions: 0
  };

  // Login Activities
  loginActivities: LoginActivity[] = [];
  loginSearchQuery: string = '';
  loginFilterStatus: 'all' | 'success' | 'failed' = 'all';

  // Suspicious Activities
  suspiciousActivities: SuspiciousActivity[] = [];

  // Admin Users
  adminUsers: AdminUser[] = [];
  newAdminEmail: string = '';
  newAdminRole: 'moderator' | 'support' = 'support';

  // User Security Management
  users: UserSecurity[] = [];
  userSearchQuery: string = '';

  // 2FA Settings
  twoFactorSettings = {
    admin2FAEnabled: true,
    enforce2FAForAll: false
  };

  // Security Logs
  securityLogs: SecurityLog[] = [];
  logFilterType: 'all' | 'password_change' | 'account_lockout' | 'permission_update' | 'system_alert' = 'all';

  // Modal
  showModal: boolean = false;
  modalType: '' | 'block' | 'unblock' | 'force_logout' | 'reset_password' | 'disable' | 'add_admin' | 'edit_admin' = '';
  selectedUser: UserSecurity | null = null;
  selectedAdmin: AdminUser | null = null;
  modalReason: string = '';

  constructor(private router: Router) {}

  ngOnInit(): void {
    const userDataStr = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    if (userDataStr) {
      this.userData = JSON.parse(userDataStr);
      if (this.userData.role !== 'admin') {
        this.router.navigate(['/login']);
        return;
      }
    } else {
      this.router.navigate(['/login']);
      return;
    }

    this.loadMockData();
  }

  loadMockData(): void {
    // Security Stats
    this.securityStats = {
      totalLoginAttempts: 1247,
      failedLoginAttempts: 89,
      blockedUsers: 12,
      suspiciousActivities: 7,
      activeAdminSessions: 3
    };

    // Login Activities
    this.loginActivities = [
      {
        id: '1',
        userName: 'Rahul Sharma',
        role: 'client',
        email: 'rahul@example.com',
        ipAddress: '192.168.1.100',
        device: 'Windows PC',
        browser: 'Chrome 120',
        loginTime: '2024-03-15 14:30:25',
        status: 'success'
      },
      {
        id: '2',
        userName: 'Sarah Johnson',
        role: 'freelancer',
        email: 'sarah@example.com',
        ipAddress: '192.168.1.101',
        device: 'MacBook Pro',
        browser: 'Safari 17',
        loginTime: '2024-03-15 14:28:15',
        status: 'success'
      },
      {
        id: '3',
        userName: 'Unknown',
        role: 'client',
        email: 'unknown@example.com',
        ipAddress: '45.33.32.156',
        device: 'Windows PC',
        browser: 'Firefox 122',
        loginTime: '2024-03-15 14:25:40',
        status: 'failed'
      },
      {
        id: '4',
        userName: 'Admin User',
        role: 'admin',
        email: 'admin@skillzyy.com',
        ipAddress: '192.168.1.1',
        device: 'MacBook Air',
        browser: 'Chrome 120',
        loginTime: '2024-03-15 14:20:00',
        status: 'success'
      },
      {
        id: '5',
        userName: 'Priya Patel',
        role: 'client',
        email: 'priya@example.com',
        ipAddress: '192.168.1.102',
        device: 'iPhone 14',
        browser: 'Safari Mobile',
        loginTime: '2024-03-15 14:15:30',
        status: 'success'
      },
      {
        id: '6',
        userName: 'Michael Chen',
        role: 'freelancer',
        email: 'michael@example.com',
        ipAddress: '203.45.67.89',
        device: 'Windows PC',
        browser: 'Edge 122',
        loginTime: '2024-03-15 14:10:45',
        status: 'success'
      },
      {
        id: '7',
        userName: 'Unknown',
        role: 'freelancer',
        email: 'hacker@test.com',
        ipAddress: '185.220.101.45',
        device: 'Linux Server',
        browser: 'Python Requests',
        loginTime: '2024-03-15 14:05:20',
        status: 'failed'
      },
      {
        id: '8',
        userName: 'Emily Davis',
        role: 'freelancer',
        email: 'emily@example.com',
        ipAddress: '192.168.1.103',
        device: 'iPad Pro',
        browser: 'Safari Mobile',
        loginTime: '2024-03-15 14:00:10',
        status: 'success'
      }
    ];

    // Suspicious Activities
    this.suspiciousActivities = [
      {
        id: '1',
        type: 'multiple_failed_login',
        userName: 'John Doe',
        userEmail: 'john@test.com',
        description: '5 failed login attempts in the last 10 minutes',
        ipAddress: '45.33.32.156',
        timestamp: '2024-03-15 14:25:40',
        severity: 'high',
        status: 'pending'
      },
      {
        id: '2',
        type: 'unusual_location',
        userName: 'Alex Turner',
        userEmail: 'alex@example.com',
        description: 'Login from unusual location (Russia) for user based in India',
        ipAddress: '95.173.95.23',
        timestamp: '2024-03-15 13:45:20',
        severity: 'medium',
        status: 'pending'
      },
      {
        id: '3',
        type: 'rapid_actions',
        userName: 'Tech Corp',
        userEmail: 'tech@corp.com',
        description: 'Rapid project posting - 10 projects in 5 minutes',
        ipAddress: '192.168.1.200',
        timestamp: '2024-03-15 12:30:15',
        severity: 'low',
        status: 'investigated'
      },
      {
        id: '4',
        type: 'fraud_behavior',
        userName: 'Suspect User',
        userEmail: 'suspect@test.com',
        description: 'Multiple payment failures followed by successful payment from new card',
        ipAddress: '185.220.101.45',
        timestamp: '2024-03-15 11:20:00',
        severity: 'high',
        status: 'pending'
      }
    ];

    // Admin Users
    this.adminUsers = [
      {
        id: '1',
        name: 'Admin User',
        email: 'admin@skillzyy.com',
        role: 'super_admin',
        status: 'active',
        lastLogin: '2024-03-15 14:20:00',
        permissions: ['all']
      },
      {
        id: '2',
        name: 'Sarah Manager',
        email: 'sarah.m@skillzyy.com',
        role: 'moderator',
        status: 'active',
        lastLogin: '2024-03-15 12:30:00',
        permissions: ['users', 'projects', 'messages']
      },
      {
        id: '3',
        name: 'Mike Support',
        email: 'mike.s@skillzyy.com',
        role: 'support',
        status: 'active',
        lastLogin: '2024-03-15 10:15:00',
        permissions: ['messages', 'users']
      },
      {
        id: '4',
        name: 'Jane Moderator',
        email: 'jane.m@skillzyy.com',
        role: 'moderator',
        status: 'inactive',
        lastLogin: '2024-03-10 09:00:00',
        permissions: ['users', 'projects']
      }
    ];

    // User Security
    this.users = [
      {
        id: '1',
        name: 'Rahul Sharma',
        email: 'rahul@example.com',
        role: 'client',
        isBlocked: false,
        is2FAEnabled: true,
        lastLogin: '2024-03-15 14:30:25',
        loginAttempts: 1
      },
      {
        id: '2',
        name: 'Sarah Johnson',
        email: 'sarah@example.com',
        role: 'freelancer',
        isBlocked: false,
        is2FAEnabled: false,
        lastLogin: '2024-03-15 14:28:15',
        loginAttempts: 1
      },
      {
        id: '3',
        name: 'Priya Patel',
        email: 'priya@example.com',
        role: 'client',
        isBlocked: true,
        is2FAEnabled: false,
        lastLogin: '2024-03-14 10:00:00',
        loginAttempts: 8
      },
      {
        id: '4',
        name: 'Michael Chen',
        email: 'michael@example.com',
        role: 'freelancer',
        isBlocked: false,
        is2FAEnabled: true,
        lastLogin: '2024-03-15 14:10:45',
        loginAttempts: 1
      },
      {
        id: '5',
        name: 'Emily Davis',
        email: 'emily@example.com',
        role: 'freelancer',
        isBlocked: false,
        is2FAEnabled: false,
        lastLogin: '2024-03-15 14:00:10',
        loginAttempts: 2
      }
    ];

    // Security Logs
    this.securityLogs = [
      {
        id: '1',
        action: 'Password Changed',
        performedBy: 'Rahul Sharma',
        targetUser: 'rahul@example.com',
        details: 'User changed their password',
        timestamp: '2024-03-15 14:30:25',
        type: 'password_change'
      },
      {
        id: '2',
        action: 'Account Locked',
        performedBy: 'System',
        targetUser: 'priya@example.com',
        details: 'Account locked due to multiple failed login attempts',
        timestamp: '2024-03-14 10:05:00',
        type: 'account_lockout'
      },
      {
        id: '3',
        action: 'Permission Updated',
        performedBy: 'Admin User',
        targetUser: 'sarah.m@skillzyy.com',
        details: 'Added message management permissions',
        timestamp: '2024-03-14 09:30:00',
        type: 'permission_update'
      },
      {
        id: '4',
        action: 'Suspicious Activity',
        performedBy: 'System',
        details: 'Multiple failed login attempts detected from IP 45.33.32.156',
        timestamp: '2024-03-15 14:25:40',
        type: 'system_alert'
      },
      {
        id: '5',
        action: 'Security Setting Changed',
        performedBy: 'Admin User',
        details: 'Two-factor authentication enforced for all users',
        timestamp: '2024-03-13 11:00:00',
        type: 'security_setting'
      },
      {
        id: '6',
        action: 'User Blocked',
        performedBy: 'Admin User',
        targetUser: 'suspended@fake.com',
        details: 'User account blocked due to policy violation',
        timestamp: '2024-03-12 15:20:00',
        type: 'account_lockout'
      }
    ];
  }

  // Filtered Login Activities
  get filteredLoginActivities(): LoginActivity[] {
    let filtered = this.loginActivities;

    if (this.loginFilterStatus !== 'all') {
      filtered = filtered.filter(a => a.status === this.loginFilterStatus);
    }

    if (this.loginSearchQuery.trim()) {
      const query = this.loginSearchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.userName.toLowerCase().includes(query) ||
        a.email.toLowerCase().includes(query) ||
        a.ipAddress.includes(query)
      );
    }

    return filtered;
  }

  // Filtered Security Logs
  get filteredSecurityLogs(): SecurityLog[] {
    let filtered = this.securityLogs;

    if (this.logFilterType !== 'all') {
      filtered = filtered.filter(l => l.type === this.logFilterType);
    }

    return filtered;
  }

  // Filtered Users
  get filteredUsers(): UserSecurity[] {
    if (!this.userSearchQuery.trim()) {
      return this.users;
    }

    const query = this.userSearchQuery.toLowerCase();
    return this.users.filter(u =>
      u.name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query)
    );
  }

  // Open Modal
  openModal(type: 'block' | 'unblock' | 'force_logout' | 'reset_password' | 'disable' | 'add_admin' | 'edit_admin', user?: UserSecurity | AdminUser): void {
    this.modalType = type;
    this.showModal = true;
    this.modalReason = '';

    if (type === 'add_admin') {
      this.selectedAdmin = null;
    } else if (type === 'edit_admin' && user) {
      this.selectedAdmin = user as AdminUser;
    } else if (user) {
      this.selectedUser = user as UserSecurity;
    }
  }

  // Close Modal
  closeModal(): void {
    this.showModal = false;
    this.modalType = '';
    this.selectedUser = null;
    this.selectedAdmin = null;
    this.modalReason = '';
  }

  // Confirm Action
  confirmAction(): void {
    if (this.modalReason.trim() === '' && this.modalType !== 'add_admin') {
      alert('Please provide a reason for this action.');
      return;
    }

    switch (this.modalType) {
      case 'block':
        if (this.selectedUser) {
          this.selectedUser.isBlocked = true;
          this.securityStats.blockedUsers++;
          this.addSecurityLog('User Blocked', 'Admin User', this.selectedUser.email, `User blocked: ${this.modalReason}`);
        }
        break;
      case 'unblock':
        if (this.selectedUser) {
          this.selectedUser.isBlocked = false;
          this.securityStats.blockedUsers--;
          this.addSecurityLog('User Unblocked', 'Admin User', this.selectedUser.email, `User unblocked: ${this.modalReason}`);
        }
        break;
      case 'force_logout':
        if (this.selectedUser) {
          this.addSecurityLog('Force Logout', 'Admin User', this.selectedUser.email, `User logged out remotely: ${this.modalReason}`);
          alert(`User ${this.selectedUser.name} has been logged out.`);
        }
        break;
      case 'reset_password':
        if (this.selectedUser) {
          this.addSecurityLog('Password Reset', 'Admin User', this.selectedUser.email, `Password reset by admin: ${this.modalReason}`);
          alert(`Password reset link sent to ${this.selectedUser.email}`);
        }
        break;
      case 'disable':
        if (this.selectedUser) {
          this.selectedUser.is2FAEnabled = false;
          this.addSecurityLog('2FA Disabled', 'Admin User', this.selectedUser.email, `2FA disabled for user: ${this.modalReason}`);
        }
        break;
      case 'add_admin':
        const newAdmin: AdminUser = {
          id: Date.now().toString(),
          name: this.newAdminEmail.split('@')[0],
          email: this.newAdminEmail,
          role: this.newAdminRole,
          status: 'active',
          lastLogin: 'Never',
          permissions: this.newAdminRole === 'support' ? ['messages', 'users'] : ['users', 'projects', 'messages']
        };
        this.adminUsers.push(newAdmin);
        this.addSecurityLog('Admin Added', 'Admin User', this.newAdminEmail, `New ${this.newAdminRole} added`);
        break;
      case 'edit_admin':
        if (this.selectedAdmin) {
          this.addSecurityLog('Admin Updated', 'Admin User', this.selectedAdmin.email, `Admin role changed: ${this.modalReason}`);
        }
        break;
    }

    this.closeModal();
  }

  // Update 2FA Settings
  update2FASettings(): void {
    const message = this.twoFactorSettings.enforce2FAForAll 
      ? 'Two-factor authentication is now enforced for all users.'
      : 'Two-factor authentication settings updated.';
    alert(message);
    this.addSecurityLog('Security Setting Changed', 'Admin User', undefined, message);
  }

  // Add Security Log
  addSecurityLog(action: string, performedBy: string, targetUser?: string, details?: string): void {
    const newLog: SecurityLog = {
      id: Date.now().toString(),
      action,
      performedBy,
      targetUser,
      details: details || '',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      type: action.toLowerCase().includes('password') ? 'password_change' :
            action.toLowerCase().includes('lock') || action.toLowerCase().includes('block') ? 'account_lockout' :
            action.toLowerCase().includes('permission') ? 'permission_update' :
            action.toLowerCase().includes('setting') ? 'security_setting' : 'system_alert'
    };
    this.securityLogs.unshift(newLog);
  }

  // Resolve Suspicious Activity
  resolveSuspiciousActivity(activity: SuspiciousActivity): void {
    activity.status = 'resolved';
    this.securityStats.suspiciousActivities--;
    alert(`Activity marked as resolved.`);
  }

  // Get Severity Class
  getSeverityClass(severity: string): string {
    switch (severity) {
      case 'high': return 'severity-high';
      case 'medium': return 'severity-medium';
      case 'low': return 'severity-low';
      default: return '';
    }
  }

  // Get Activity Type Label
  getActivityTypeLabel(type: string): string {
    switch (type) {
      case 'multiple_failed_login': return 'Failed Login Attempts';
      case 'unusual_location': return 'Unusual Location';
      case 'rapid_actions': return 'Rapid Actions';
      case 'fraud_behavior': return 'Fraud Behavior';
      default: return type;
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

