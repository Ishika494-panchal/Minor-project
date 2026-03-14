import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

interface MessageItem {
  id: string;
  text: string;
  time: string;
  sent: boolean;
}

interface ConversationItem {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  online: boolean;
  messages: MessageItem[];
}

@Component({
  selector: 'app-client-messages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './client-messages.component.html',
  styleUrls: ['../../freelancer-dashboard/freelancer-messages/freelancer-messages.component.css']
})
export class ClientMessagesComponent implements OnInit {
  private readonly storageKeyPrefix = 'clientMessagesState:';

  showNotifications = false;
  showProfileMenu = false;
  searchQuery = '';
  userData: any = null;

  notificationsList = [
    { id: 1, type: 'proposal', message: 'New proposal received for your project.', time: '10 min ago', read: false },
    { id: 2, type: 'message', message: 'You have a new message from freelancer.', time: '1 hour ago', read: false }
  ];

  conversations: ConversationItem[] = [
    {
      id: 'demo-1',
      name: 'akshad vengurlekar',
      avatar: 'assets/client.jpeg',
      lastMessage: 'Please share final deployment link.',
      lastMessageTime: 'Just now',
      unread: 0,
      online: true,
      messages: [
        { id: '1', text: 'Hi, project is almost done.', time: '10:12 AM', sent: false },
        { id: '2', text: 'Great! Please share final deployment link.', time: '10:14 AM', sent: true }
      ]
    }
  ];

  selectedConversation: ConversationItem | null = null;
  newMessage = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const userDataStr = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    if (userDataStr) {
      this.userData = JSON.parse(userDataStr);
    }

    const storedConversations = this.loadConversationsState();
    if (storedConversations && storedConversations.length > 0) {
      this.conversations = storedConversations;
    } else {
      this.saveConversationsState();
    }

    this.selectedConversation = this.conversations[0] || null;

    const partnerId = this.route.snapshot.queryParamMap.get('partnerId') || '';
    const partnerName = this.route.snapshot.queryParamMap.get('partnerName') || '';
    if (partnerId) {
      this.openOrCreateConversation(partnerId, partnerName);
    }
  }

  private openOrCreateConversation(partnerId: string, partnerName: string): void {
    const existing = this.conversations.find(
      (c) =>
        c.id === partnerId ||
        c.name.trim().toLowerCase() === partnerName.trim().toLowerCase()
    );

    if (existing) {
      this.selectConversation(existing);
      return;
    }

    const conversation: ConversationItem = {
      id: partnerId,
      name: partnerName || 'Freelancer',
      avatar: 'assets/client.jpeg',
      lastMessage: 'Start your conversation.',
      lastMessageTime: 'Just now',
      unread: 0,
      online: false,
      messages: []
    };

    this.conversations = [conversation, ...this.conversations];
    this.selectConversation(conversation);
    this.saveConversationsState();
  }

  selectConversation(conversation: ConversationItem): void {
    this.selectedConversation = conversation;
    conversation.unread = 0;
    this.saveConversationsState();
  }

  sendMessage(): void {
    if (!this.selectedConversation || !this.newMessage.trim()) {
      return;
    }

    const target = this.selectedConversation;
    const message: MessageItem = {
      id: Date.now().toString(),
      text: this.newMessage.trim(),
      time: this.getCurrentTime(),
      sent: true
    };

    target.messages.push(message);
    target.lastMessage = message.text;
    target.lastMessageTime = 'Just now';
    this.newMessage = '';
    this.saveConversationsState();
  }

  private getCurrentTime(): string {
    return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
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
  }

  toggleProfileMenu(event: Event): void {
    event.stopPropagation();
    this.showProfileMenu = !this.showProfileMenu;
    this.showNotifications = false;
  }

  markAllAsRead(): void {
    this.notificationsList.forEach((n: any) => (n.read = true));
  }

  get unreadCount(): number {
    return this.notificationsList.filter((n: any) => !n.read).length;
  }

  getNotificationIcon(type: string): string {
    const icons: Record<string, string> = {
      proposal: 'fas fa-file-alt',
      payment: 'fas fa-dollar-sign',
      message: 'fas fa-envelope',
      project: 'fas fa-folder-open'
    };
    return icons[type] || 'fas fa-bell';
  }

  goToDashboard(): void { this.router.navigate(['/client-dashboard']); }
  goToProjects(): void { this.router.navigate(['/projects']); }
  goToFindFreelancers(): void { this.router.navigate(['/find-freelancers']); }
  goToPayments(): void { this.router.navigate(['/client-payments']); }
  goToProfile(): void { this.router.navigate(['/client-profile']); }
  goToSettings(): void { this.router.navigate(['/client-settings']); }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    this.router.navigate(['/login']);
  }

  private getStorageKey(): string {
    const userId = this.userData?.id || this.userData?._id || this.userData?.email || 'unknown';
    return `${this.storageKeyPrefix}${userId}`;
  }

  private loadConversationsState(): ConversationItem[] | null {
    try {
      const raw = localStorage.getItem(this.getStorageKey());
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as ConversationItem[]) : null;
    } catch {
      return null;
    }
  }

  private saveConversationsState(): void {
    try {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(this.conversations));
    } catch {
      // ignore
    }
  }
}
