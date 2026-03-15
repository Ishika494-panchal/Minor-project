import { ChangeDetectorRef, Component, HostListener, NgZone, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChatConversation, ChatMessage, MessageService } from '../../../services/message.service';
import { NotificationItem as BackendNotification, NotificationService } from '../../../services/notification.service';

interface Message {
  id: string;
  text: string;
  time: string;
  sent: boolean;
  attachment?: Attachment;
}

interface Attachment {
  name: string;
  type: string;
  size: number;
  url?: string;
}

interface Conversation {
  id: string;
  partnerId: string;
  projectId: string | null;
  name: string;
  avatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  online: boolean;
  messages: Message[];
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
  selector: 'app-freelancer-messages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './freelancer-messages.component.html',
  styleUrls: ['./freelancer-messages.component.css']
})
export class FreelancerMessagesComponent implements OnInit, OnDestroy {
  private subscriptions = new Subscription();
  private currentUserId = '';

  isMobileOrTablet = false;
  isSidebarOpen = false;
  showNotifications = false;
  showProfileMenu = false;
  searchQuery = '';
  userData: any = null;

  notificationsList: NotificationItem[] = [];
  unreadBellCount = 0;

  conversations: Conversation[] = [];
  selectedConversation: Conversation | null = null;
  mobileChatOpen = false;
  newMessage = '';
  isSending = false;

  allowedFileTypes = ['.pdf', '.png', '.jpg', '.jpeg', '.zip'];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService,
    private notificationService: NotificationService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.updateViewportState();
    const rawUser = localStorage.getItem('userData') || sessionStorage.getItem('userData') || '';
    this.userData = rawUser ? JSON.parse(rawUser) : null;
    this.currentUserId = this.userData?._id || this.userData?.id || '';
    const token = this.getAuthToken();
    if (!token || !this.currentUserId) return;

    this.messageService.connect(token);
    this.bindRealtime();
    this.loadNotifications();
    this.loadUnreadCount();
    this.loadConversations(() => {
      const partnerId = this.route.snapshot.queryParamMap.get('partnerId') || '';
      const partnerName = this.route.snapshot.queryParamMap.get('partnerName') || '';
      const projectId = this.route.snapshot.queryParamMap.get('projectId') || null;
      if (partnerId) {
        this.ensureConversation(partnerId, partnerName, projectId);
      } else if (!this.isMobileOrTablet && this.conversations.length) {
        this.selectConversation(this.conversations[0]);
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateViewportState();
  }

  private updateViewportState(): void {
    const wasMobile = this.isMobileOrTablet;
    this.isMobileOrTablet = window.innerWidth <= 1024;
    if (!this.isMobileOrTablet) {
      this.isSidebarOpen = false;
      this.mobileChatOpen = false;
      if (!this.selectedConversation && this.conversations.length) {
        this.selectConversation(this.conversations[0]);
      }
    } else if (!wasMobile) {
      this.mobileChatOpen = false;
    }
  }

  private bindRealtime(): void {
    this.subscriptions.add(
      this.messageService.socketMessage$.subscribe((msg) => {
        if (!msg) return;
        this.ngZone.run(() => {
          const conversationId = String(msg.conversationId || '');
          if (this.selectedConversation?.id === conversationId) {
            const mapped = this.mapMessage(msg);
            const exists = this.selectedConversation.messages.some((m) => m.id === mapped.id);
            if (!exists) this.selectedConversation.messages.push(mapped);
            if (String(msg.receiverId?._id || '') === this.currentUserId) {
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
            if (partnerName) {
              this.selectedConversation = {
                id: ensuredId,
                partnerId,
                projectId,
                name: partnerName,
                avatar: 'assets/client.jpeg',
                lastMessage: 'Start your conversation.',
                lastMessageTime: 'Just now',
                unread: 0,
                online: false,
                messages: []
              };
            }
            this.cdr.detectChanges();
          });
        });
      }
    });
  }

  private loadConversations(after?: () => void): void {
    this.messageService.getConversations().subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          const selectedId = this.selectedConversation?.id || '';
          this.conversations = (res?.conversations || []).map((conv) => this.mapConversation(conv));
          if (selectedId) {
            const selected = this.conversations.find((conv) => conv.id === selectedId);
            if (selected) {
              this.selectedConversation = {
                ...selected,
                messages: this.selectedConversation?.messages || []
              };
            }
          }
          after?.();
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          after?.();
          this.cdr.detectChanges();
        });
      }
    });
  }

  private loadMessages(conversation: Conversation): void {
    this.messageService.getMessages(conversation.id, 50).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          const messages = (res?.messages || []).map((msg) => this.mapMessage(msg));
          conversation.messages = messages;
          if (this.selectedConversation?.id === conversation.id) {
            this.selectedConversation.messages = messages;
          }
          this.cdr.detectChanges();
        });
      }
    });
  }

  selectConversation(conversation: Conversation): void {
    this.selectedConversation = conversation;
    this.selectedConversation.unread = 0;
    this.messageService.joinRoom(conversation.id);
    this.loadMessages(conversation);
    this.messageService.markAsRead(conversation.id).subscribe({
      next: () => this.loadConversations()
    });
    if (this.isMobileOrTablet) this.mobileChatOpen = true;
  }

  backToConversationList(): void {
    if (this.isMobileOrTablet) this.mobileChatOpen = false;
  }

  get showConversationList(): boolean {
    return !this.isMobileOrTablet || !this.mobileChatOpen;
  }

  get showChatPanel(): boolean {
    return !this.isMobileOrTablet || this.mobileChatOpen;
  }

  sendMessage(): void {
    if (!this.selectedConversation || !this.newMessage.trim() || this.isSending) return;
    this.isSending = true;
    this.messageService.sendMessage(this.selectedConversation.id, {
      textContent: this.newMessage.trim(),
      messageType: 'text'
    }).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.newMessage = '';
          this.isSending = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.isSending = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.selectedConversation) return;

    const fileName = file.name.toLowerCase();
    const allowed = this.allowedFileTypes.some((type) => fileName.endsWith(type));
    if (!allowed) {
      alert('Invalid file type. Please upload PDF, PNG, JPG, or ZIP files only.');
      input.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.messageService.sendMessage(this.selectedConversation!.id, {
        textContent: this.newMessage.trim() || '',
        messageType: this.getFileType(fileName) === 'image' ? 'image' : 'file',
        attachment: {
          fileName: file.name,
          fileType: file.type || this.getFileType(fileName),
          fileSize: file.size,
          fileData: String(reader.result || '')
        }
      }).subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.newMessage = '';
            this.cdr.detectChanges();
          });
        }
      });
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  getFileType(fileName: string): string {
    if (fileName.endsWith('.pdf')) return 'pdf';
    if (fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) return 'image';
    if (fileName.endsWith('.zip')) return 'zip';
    return 'file';
  }

  getFileIcon(type: string): string {
    if (type === 'pdf') return 'fas fa-file-pdf';
    if (type === 'image') return 'fas fa-file-image';
    if (type === 'zip') return 'fas fa-file-archive';
    return 'fas fa-file';
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  toggleSidebar(event?: Event): void {
    event?.stopPropagation();
    if (!this.isMobileOrTablet) return;
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar(): void {
    if (this.isMobileOrTablet) this.isSidebarOpen = false;
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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-wrapper') && !target.closest('.profile-wrapper')) {
      this.showNotifications = false;
      this.showProfileMenu = false;
    }
    if (this.isMobileOrTablet && this.isSidebarOpen && !target.closest('.sidebar') && !target.closest('.hamburger-btn')) {
      this.isSidebarOpen = false;
    }
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

  get unreadCount(): number {
    return this.unreadBellCount;
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

  logout(): void {
    this.closeSidebar();
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    this.router.navigate(['/login']);
  }

  goToProfile(): void { this.showProfileMenu = false; this.closeSidebar(); this.router.navigate(['/freelancer-profile']); }
  goToSettings(): void { this.showProfileMenu = false; this.closeSidebar(); this.router.navigate(['/freelancer-settings']); }
  goToDashboard(): void { this.closeSidebar(); this.router.navigate(['/freelancer-dashboard']); }
  goToFindJobs(): void { this.closeSidebar(); this.router.navigate(['/find-jobs']); }
  goToMyGigs(): void { this.closeSidebar(); this.router.navigate(['/my-gigs']); }
  goToProjects(): void { this.closeSidebar(); this.router.navigate(['/my-projects']); }
  goToEarnings(): void { this.closeSidebar(); this.router.navigate(['/freelancer-earnings']); }

  onAvatarError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (!img) return;
    img.onerror = null;
    img.src = 'assets/client.jpeg';
  }

  private mapConversation(conversation: ChatConversation): Conversation {
    return {
      id: conversation.id,
      partnerId: conversation.partner.id,
      projectId: conversation.projectId,
      name: conversation.partner.fullName || 'Client',
      avatar: conversation.partner.profileImage || 'assets/client.jpeg',
      lastMessage: conversation.lastMessage || 'Start your conversation.',
      lastMessageTime: this.toDisplayTime(conversation.lastMessageAt),
      unread: conversation.unreadCount || 0,
      online: false,
      messages: []
    };
  }

  private mapMessage(message: ChatMessage): Message {
    return {
      id: String(message._id),
      text: message.isDeleted ? 'Message deleted' : (message.textContent || ''),
      time: this.toDisplayTime(message.createdAt),
      sent: String(message.senderId?._id || '') === this.currentUserId,
      attachment: message.attachment?.fileName ? {
        name: message.attachment.fileName || 'Attachment',
        type: this.getFileType(message.attachment.fileName || ''),
        size: Number(message.attachment.fileSize || 0),
        url: message.attachment.fileData || message.attachment.fileUrl || ''
      } : undefined
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
}

