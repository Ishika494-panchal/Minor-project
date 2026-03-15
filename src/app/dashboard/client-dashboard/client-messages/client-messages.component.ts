import { ChangeDetectorRef, Component, HostListener, NgZone, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService, ChatConversation, ChatMessage } from '../../../services/message.service';
import { Subscription } from 'rxjs';
import { NotificationItem as BackendNotification, NotificationService } from '../../../services/notification.service';

interface MessageItem {
  id: string;
  text: string;
  time: string;
  sent: boolean;
}

interface ConversationItem {
  id: string;
  partnerId: string;
  projectId: string | null;
  name: string;
  avatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  online: boolean;
  messages: MessageItem[];
}

interface NotificationItem {
  id: string;
  type: string;
  message: string;
  time: string;
  read: boolean;
  actionUrl?: string;
}

@Component({
  selector: 'app-client-messages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './client-messages.component.html',
  styleUrls: [
    '../../freelancer-dashboard/freelancer-messages/freelancer-messages.component.css',
    '../client-responsive-shared.css',
    './client-messages.component.css'
  ]
})
export class ClientMessagesComponent implements OnInit, OnDestroy {
  private subscriptions = new Subscription();
  private currentUserId = '';
  isSidebarOpen = false;

  showNotifications = false;
  showProfileMenu = false;
  searchQuery = '';
  userData: any = null;

  notificationsList: NotificationItem[] = [];
  unreadBellCount = 0;

  conversations: ConversationItem[] = [];

  selectedConversation: ConversationItem | null = null;
  newMessage = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService,
    private notificationService: NotificationService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const userDataStr = localStorage.getItem('userData') || sessionStorage.getItem('userData') || '';
    if (userDataStr) {
      this.userData = JSON.parse(userDataStr);
    }
    this.currentUserId = this.userData?._id || this.userData?.id || '';
    const authToken = this.getAuthToken();
    if (!this.currentUserId || !authToken) {
      return;
    }
    this.messageService.connect(authToken);
    this.bindRealtime();
    this.loadNotifications();
    this.loadUnreadCount();

    const partnerId = this.route.snapshot.queryParamMap.get('partnerId') || '';
    const partnerName = this.route.snapshot.queryParamMap.get('partnerName') || '';
    const projectId = this.route.snapshot.queryParamMap.get('projectId') || null;
    this.loadConversations(() => {
      if (partnerId) {
        this.ensureConversation(partnerId, partnerName, projectId);
      } else {
        this.selectedConversation = this.conversations[0] || null;
        if (this.selectedConversation) {
          this.selectConversation(this.selectedConversation);
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private bindRealtime(): void {
    this.subscriptions.add(
      this.messageService.socketMessage$.subscribe((incoming) => {
        if (!incoming) return;
        this.ngZone.run(() => {
          const conversationId = String(incoming.conversationId || '');
          if (this.selectedConversation?.id === conversationId) {
            const mapped = this.mapMessage(incoming);
            const exists = this.selectedConversation.messages.some((m) => m.id === mapped.id);
            if (!exists) this.selectedConversation.messages.push(mapped);
            if (String(incoming.receiverId?._id || '') === this.currentUserId) {
              this.messageService.markAsRead(conversationId).subscribe();
            }
          }
          this.loadConversations();
          this.cdr.detectChanges();
        });
      })
    );

    this.subscriptions.add(
      this.messageService.conversationRefresh$.subscribe((conversationId) => {
        if (!conversationId) return;
        this.ngZone.run(() => {
          this.loadConversations();
          this.cdr.detectChanges();
        });
      })
    );

    this.subscriptions.add(
      this.messageService.socketNotification$.subscribe((notification) => {
        if (!notification) return;
        this.ngZone.run(() => {
          const mapped = this.mapNotification(notification);
          this.notificationsList = [mapped, ...this.notificationsList];
          this.unreadBellCount += mapped.read ? 0 : 1;
          this.cdr.detectChanges();
        });
      })
    );

    this.subscriptions.add(
      this.messageService.socketNotificationCount$.subscribe((count) => {
        if (count === null || typeof count !== 'number') return;
        this.ngZone.run(() => {
          this.unreadBellCount = Math.max(0, count);
          this.cdr.detectChanges();
        });
      })
    );
  }

  private ensureConversation(partnerId: string, partnerName: string, projectId: string | null): void {
    this.messageService.ensureConversation({
      partnerId,
      projectId,
      conversationType: projectId ? 'project' : 'direct'
    }).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          const ensuredId = String(res?.conversation?._id || '');
          this.loadConversations(() => {
            const target = this.conversations.find((c) => c.id === ensuredId);
            if (target) {
              this.selectConversation(target);
              return;
            }
            this.selectedConversation = {
              id: ensuredId,
              partnerId,
              projectId,
              name: partnerName || 'Freelancer',
              avatar: 'assets/client.jpeg',
              lastMessage: 'Start your conversation.',
              lastMessageTime: 'Just now',
              unread: 0,
              online: false,
              messages: []
            };
            this.cdr.detectChanges();
          });
        });
      }
    });
  }

  private loadConversations(afterLoad?: () => void): void {
    this.messageService.getConversations().subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          const selectedId = this.selectedConversation?.id || '';
          this.conversations = (res?.conversations || []).map((conv) => this.mapConversation(conv));
          if (selectedId) {
            const selected = this.conversations.find((c) => c.id === selectedId);
            if (selected) {
              this.selectedConversation = { ...selected, messages: this.selectedConversation?.messages || [] };
            }
          }
          afterLoad?.();
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          afterLoad?.();
          this.cdr.detectChanges();
        });
      }
    });
  }

  private loadMessages(conversationId: string): void {
    this.messageService.getMessages(conversationId, 50).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          if (!this.selectedConversation) return;
          this.selectedConversation.messages = (res?.messages || []).map((msg) => this.mapMessage(msg));
          this.cdr.detectChanges();
        });
      }
    });
  }

  selectConversation(conversation: ConversationItem): void {
    this.selectedConversation = conversation;
    conversation.unread = 0;
    this.messageService.joinRoom(conversation.id);
    this.loadMessages(conversation.id);
    this.messageService.markAsRead(conversation.id).subscribe({
      next: () => this.loadConversations()
    });
  }

  sendMessage(): void {
    if (!this.selectedConversation || !this.newMessage.trim()) {
      return;
    }

    this.messageService.sendMessage(this.selectedConversation.id, {
      textContent: this.newMessage.trim(),
      messageType: 'text'
    }).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.newMessage = '';
          this.cdr.detectChanges();
        });
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-wrapper') && !target.closest('.profile-wrapper')) {
      this.showNotifications = false;
      this.showProfileMenu = false;
    }
  }

  toggleNotifications(event: Event): void {
    event.stopPropagation();
    this.showNotifications = !this.showNotifications;
    this.showProfileMenu = false;
    if (this.showNotifications) {
      this.loadNotifications();
    }
  }

  toggleProfileMenu(event: Event): void {
    event.stopPropagation();
    this.showProfileMenu = !this.showProfileMenu;
    this.showNotifications = false;
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.notificationsList = this.notificationsList.map((n) => ({ ...n, read: true }));
          this.unreadBellCount = 0;
          this.cdr.detectChanges();
        });
      }
    });
  }

  get unreadCount(): number {
    return this.unreadBellCount;
  }

  getNotificationIcon(type: string): string {
    const icons: Record<string, string> = {
      chat_message: 'fas fa-envelope',
      order_created: 'fas fa-shopping-cart',
      order_accepted: 'fas fa-check-circle',
      delivery_submitted: 'fas fa-upload',
      revision_requested: 'fas fa-rotate-left',
      payment_success: 'fas fa-dollar-sign',
      project_approved: 'fas fa-circle-check',
      dispute_opened: 'fas fa-gavel',
      system_alert: 'fas fa-triangle-exclamation'
    };
    return icons[type] || 'fas fa-bell';
  }

  onNotificationClick(notification: NotificationItem, event?: Event): void {
    event?.stopPropagation();
    if (!notification.read) {
      this.notificationService.markAsRead(notification.id).subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.notificationsList = this.notificationsList.map((item) =>
              item.id === notification.id ? { ...item, read: true } : item
            );
            this.unreadBellCount = Math.max(0, this.unreadBellCount - 1);
            this.cdr.detectChanges();
          });
        }
      });
    }

    if (notification.actionUrl) {
      this.showNotifications = false;
      this.router.navigateByUrl(notification.actionUrl);
    }
  }

  deleteNotification(notification: NotificationItem, event?: Event): void {
    event?.stopPropagation();
    this.notificationService.markAsRead(notification.id).subscribe({
      next: () => {
        this.notificationService.archiveNotification(notification.id).subscribe({
          next: () => {
            this.ngZone.run(() => {
              const wasUnread = !notification.read;
              this.notificationsList = this.notificationsList.filter((item) => item.id !== notification.id);
              if (wasUnread) {
                this.unreadBellCount = Math.max(0, this.unreadBellCount - 1);
              }
              this.cdr.detectChanges();
            });
          }
        });
      }
    });
  }

  goToDashboard(): void { this.router.navigate(['/client-dashboard']); }
  goToProjects(): void { this.router.navigate(['/projects']); }
  goToFindFreelancers(): void { this.router.navigate(['/find-freelancers']); }
  goToPayments(): void { this.router.navigate(['/client-payments']); }
  goToProfile(): void { this.router.navigate(['/client-profile']); }
  goToSettings(): void { this.router.navigate(['/client-settings']); }

  toggleSidebar(event?: Event): void {
    event?.stopPropagation();
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    this.router.navigate(['/login']);
  }

  private mapConversation(conversation: ChatConversation): ConversationItem {
    return {
      id: conversation.id,
      partnerId: conversation.partner.id,
      projectId: conversation.projectId,
      name: conversation.partner.fullName || 'Freelancer',
      avatar: conversation.partner.profileImage || 'assets/client.jpeg',
      lastMessage: conversation.lastMessage || 'Start your conversation.',
      lastMessageTime: this.toDisplayTime(conversation.lastMessageAt),
      unread: conversation.unreadCount || 0,
      online: false,
      messages: []
    };
  }

  private mapMessage(message: ChatMessage): MessageItem {
    return {
      id: String(message._id),
      text: message.isDeleted ? 'Message deleted' : (message.textContent || ''),
      time: this.toDisplayTime(message.createdAt),
      sent: String(message.senderId?._id || '') === this.currentUserId
    };
  }

  private toDisplayTime(value: string | Date): string {
    if (!value) return 'Just now';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Just now';
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  private getAuthToken(): string {
    const raw = localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
    return raw.replace(/^"(.*)"$/, '$1').trim();
  }

  private loadNotifications(): void {
    this.notificationService.getMyNotifications(30, 1).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.notificationsList = (res?.notifications || []).map((item: BackendNotification) =>
            this.mapNotification(item)
          );
          this.unreadBellCount = Number(res?.unreadCount || 0);
          this.cdr.detectChanges();
        });
      }
    });
  }

  private loadUnreadCount(): void {
    this.notificationService.getUnreadCount().subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.unreadBellCount = Number(res?.unreadCount || 0);
          this.cdr.detectChanges();
        });
      }
    });
  }

  private mapNotification(notification: BackendNotification): NotificationItem {
    return {
      id: String(notification.id),
      type: notification.type,
      message: notification.message || notification.title || 'New update',
      time: this.toRelativeTime(notification.createdAt),
      read: !!notification.isRead,
      actionUrl: notification.actionUrl || ''
    };
  }

  private toRelativeTime(value: string | Date): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Just now';
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  }

  onAvatarError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (!img) {
      return;
    }
    img.onerror = null;
    img.src = 'assets/skillzyy-logo.png';
  }
}
