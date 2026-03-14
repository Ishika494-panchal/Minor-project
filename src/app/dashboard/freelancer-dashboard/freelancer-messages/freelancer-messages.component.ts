import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

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
  name: string;
  avatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  online: boolean;
  messages: Message[];
}

interface NotificationItem {
  id: number;
  type: string;
  message: string;
  time: string;
  read: boolean;
}

@Component({
  selector: 'app-freelancer-messages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './freelancer-messages.component.html',
  styleUrls: ['./freelancer-messages.component.css']
})
export class FreelancerMessagesComponent implements OnInit {
  private readonly storageKeyPrefix = 'freelancerMessagesState:';
  // Navbar
  showNotifications = false;
  showProfileMenu = false;
  searchQuery = '';
  userData: any = null;

  // Notifications
  notificationsList: NotificationItem[] = [
    {
      id: 1,
      type: 'job',
      message: 'New job matching your skills: React Developer',
      time: '2 hours ago',
      read: false
    },
    {
      id: 2,
      type: 'message',
      message: 'You have a new message from Tech Solutions Inc.',
      time: '5 hours ago',
      read: false
    },
    {
      id: 3,
      type: 'payment',
      message: 'Payment received: ₹15,000',
      time: '1 day ago',
      read: true
    }
  ];

  // Conversations
  conversations: Conversation[] = [
    {
      id: '1',
      name: 'Rahul Sharma',
      avatar: 'assets/client.jpeg',
      lastMessage: 'Can you deliver the project by Monday?',
      lastMessageTime: '2 min ago',
      unread: 2,
      online: true,
      messages: [
        { id: '1', text: 'Hello! I need a landing page design.', time: '10:30 AM', sent: false },
        { id: '2', text: 'Sure, I can help with that. What are your requirements?', time: '10:32 AM', sent: true },
        { id: '3', text: 'I need a modern, responsive design for my tech startup.', time: '10:35 AM', sent: false },
        { id: '4', text: 'That sounds great! I have extensive experience in startup designs.', time: '10:38 AM', sent: true },
        { id: '5', text: 'Can you deliver the project by Monday?', time: '10:40 AM', sent: false }
      ]
    },
    {
      id: '2',
      name: 'Priya Patel',
      avatar: 'assets/client.jpeg',
      lastMessage: 'Thank you for the quick delivery!',
      lastMessageTime: '1 hour ago',
      unread: 0,
      online: false,
      messages: [
        { id: '1', text: 'Hi, I loved your portfolio!', time: '09:00 AM', sent: false },
        { id: '2', text: 'Thank you! Happy to work with you.', time: '09:15 AM', sent: true },
        { id: '3', text: 'Thank you for the quick delivery!', time: '11:00 AM', sent: false }
      ]
    },
    {
      id: '3',
      name: 'Amit Kumar',
      avatar: 'assets/client.jpeg',
      lastMessage: 'Let me review and get back to you.',
      lastMessageTime: 'Yesterday',
      unread: 1,
      online: true,
      messages: [
        { id: '1', text: 'I have a new project for you.', time: 'Yesterday', sent: false },
        { id: '2', text: 'That sounds interesting! Tell me more.', time: 'Yesterday', sent: true },
        { id: '3', text: 'Let me review and get back to you.', time: 'Yesterday', sent: false }
      ]
    },
    {
      id: '4',
      name: 'Sneha Gupta',
      avatar: 'assets/client.jpeg',
      lastMessage: 'The design looks amazing!',
      lastMessageTime: '2 days ago',
      unread: 0,
      online: false,
      messages: [
        { id: '1', text: 'I received the initial designs.', time: '2 days ago', sent: false },
        { id: '2', text: 'Great! Let me know your feedback.', time: '2 days ago', sent: true },
        { id: '3', text: 'The design looks amazing!', time: '2 days ago', sent: false }
      ]
    }
  ];

  // Selected conversation
  selectedConversation: Conversation | null = null;

  // New message input
  newMessage: string = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const userDataStr = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    if (userDataStr) {
      this.userData = JSON.parse(userDataStr);
    } else {
      this.userData = {
        fullName: 'John Doe',
        email: 'john@example.com',
        avatar: ''
      };
    }
    
    // Select first conversation by default
    if (this.conversations.length > 0) {
      this.selectedConversation = this.conversations[0];
    }

    const storedConversations = this.loadConversationsState();
    if (storedConversations && storedConversations.length > 0) {
      this.conversations = storedConversations;
      this.selectedConversation = this.conversations[0] || null;
    } else {
      this.saveConversationsState();
    }

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

    const newConversation: Conversation = {
      id: partnerId,
      name: partnerName || 'Client',
      avatar: 'assets/client.jpeg',
      lastMessage: 'Start your conversation.',
      lastMessageTime: 'Just now',
      unread: 0,
      online: false,
      messages: []
    };

    this.conversations = [newConversation, ...this.conversations];
    this.selectConversation(newConversation);
    this.saveConversationsState();
  }

  selectConversation(conversation: Conversation): void {
    this.selectedConversation = conversation;
    conversation.unread = 0;
    this.saveConversationsState();
  }

  sendMessage(): void {
    if (this.newMessage.trim() && this.selectedConversation) {
      const targetConversation = this.selectedConversation;
      const message: Message = {
        id: Date.now().toString(),
        text: this.newMessage.trim(),
        time: this.getCurrentTime(),
        sent: true
      };

      targetConversation.messages.push(message);
      targetConversation.lastMessage = this.newMessage.trim();
      targetConversation.lastMessageTime = 'Just now';
      
      this.newMessage = '';
      this.saveConversationsState();

      // Simulate reply after 2 seconds
      setTimeout(() => {
        const reply: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Thanks for your message! I\'ll get back to you soon.',
          time: this.getCurrentTime(),
          sent: false
        };
        targetConversation.messages.push(reply);
        targetConversation.lastMessage = reply.text;
        targetConversation.lastMessageTime = 'Just now';
        this.saveConversationsState();
      }, 2000);
    }
  }

  getCurrentTime(): string {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }

  // Navbar methods
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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-wrapper') && !target.closest('.profile-wrapper')) {
      this.showNotifications = false;
      this.showProfileMenu = false;
    }
  }

  search(): void {
    console.log('Searching:', this.searchQuery);
  }

  getNotificationIcon(type: string): string {
    const icons: { [key: string]: string } = {
      job: 'fas fa-briefcase',
      payment: 'fas fa-dollar-sign',
      message: 'fas fa-envelope',
      project: 'fas fa-folder-open',
      review: 'fas fa-star'
    };
    return icons[type] || 'fas fa-bell';
  }

  get unreadCount(): number {
    return this.notificationsList.filter(n => !n.read).length;
  }

  markAllAsRead(): void {
    this.notificationsList.forEach(n => n.read = true);
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    this.router.navigate(['/login']);
  }

  goToProfile(): void {
    this.showProfileMenu = false;
  }

  goToSettings(): void {
    this.showProfileMenu = false;
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

  goToProjects(): void {
    this.router.navigate(['/my-projects']);
  }

  goToEarnings(): void {
    this.router.navigate(['/freelancer-earnings']);
  }

  // File attachment handling
  allowedFileTypes = ['.pdf', '.png', '.jpg', '.jpeg', '.zip'];
  
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const fileName = file.name.toLowerCase();
      
      // Check if file type is allowed
      const isAllowed = this.allowedFileTypes.some(type => fileName.endsWith(type));
      
      if (!isAllowed) {
        alert('Invalid file type. Please upload PDF, PNG, JPG, or ZIP files only.');
        return;
      }
      
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size exceeds 10MB limit.');
        return;
      }
      
      // Create attachment object
      const attachment: Attachment = {
        name: file.name,
        type: this.getFileType(fileName),
        size: file.size
      };
      
      // Send message with attachment
      if (this.selectedConversation) {
        const targetConversation = this.selectedConversation;
        const message: Message = {
          id: Date.now().toString(),
          text: this.newMessage.trim() || `Sent attachment: ${file.name}`,
          time: this.getCurrentTime(),
          sent: true,
          attachment: attachment
        };
        
        targetConversation.messages.push(message);
        targetConversation.lastMessage = message.text;
        targetConversation.lastMessageTime = 'Just now';
        
        this.newMessage = '';
        this.saveConversationsState();
        
        // Simulate reply after 2 seconds
        setTimeout(() => {
          const reply: Message = {
            id: (Date.now() + 1).toString(),
            text: 'Thanks for the attachment! I\'ll review it and get back to you.',
            time: this.getCurrentTime(),
            sent: false
          };
          targetConversation.messages.push(reply);
          targetConversation.lastMessage = reply.text;
          targetConversation.lastMessageTime = 'Just now';
          this.saveConversationsState();
        }, 2000);
      }
      
      // Reset input
      input.value = '';
    }
  }
  
  getFileType(fileName: string): string {
    if (fileName.endsWith('.pdf')) return 'pdf';
    if (fileName.endsWith('.png')) return 'image';
    if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) return 'image';
    if (fileName.endsWith('.zip')) return 'zip';
    return 'file';
  }
  
  getFileIcon(type: string): string {
    switch (type) {
      case 'pdf': return 'fas fa-file-pdf';
      case 'image': return 'fas fa-file-image';
      case 'zip': return 'fas fa-file-archive';
      default: return 'fas fa-file';
    }
  }
  
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  private getStorageKey(): string {
    const userId = this.userData?.id || this.userData?._id || this.userData?.email || 'unknown';
    return `${this.storageKeyPrefix}${userId}`;
  }

  private loadConversationsState(): Conversation[] | null {
    try {
      const raw = localStorage.getItem(this.getStorageKey());
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as Conversation[]) : null;
    } catch {
      return null;
    }
  }

  private saveConversationsState(): void {
    try {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(this.conversations));
    } catch {
      // Ignore storage errors to avoid interrupting chat UX.
    }
  }
}

