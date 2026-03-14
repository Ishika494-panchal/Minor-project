import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// Message and Conversation Interfaces
interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'client' | 'freelancer' | 'admin';
  text: string;
  time: string;
  isAdmin: boolean;
  attachment?: Attachment;
  isReported?: boolean;
  reportReason?: string;
}

interface Attachment {
  name: string;
  type: string;
  size: number;
  url?: string;
}

interface Conversation {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatar: string;
  freelancerId: string;
  freelancerName: string;
  freelancerAvatar: string;
  projectTitle: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  isOnline: boolean;
  status: 'active' | 'resolved' | 'disputed' | 'reported';
  messages: Message[];
}

interface ReportedMessage {
  id: string;
  conversationId: string;
  messageId: string;
  reportedBy: string;
  reportedAt: string;
  reason: string;
  messageText: string;
  senderName: string;
  senderRole: 'client' | 'freelancer';
  status: 'pending' | 'reviewed' | 'action_taken';
}

interface SupportChat {
  id: string;
  userId: string;
  userName: string;
  userRole: 'client' | 'freelancer';
  userAvatar: string;
  subject: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  status: 'open' | 'pending' | 'resolved';
  messages: Message[];
}

@Component({
  selector: 'app-admin-messages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-messages.component.html',
  styleUrls: ['./admin-messages.component.css']
})
export class AdminMessagesComponent implements OnInit {
  // User data
  userData: any = null;

  // View mode: 'conversations' | 'reported' | 'support'
  viewMode: 'conversations' | 'reported' | 'support' = 'conversations';

  // Filter
  filterStatus: 'all' | 'active' | 'reported' | 'disputed' | 'resolved' = 'all';
  searchQuery: string = '';

  // Conversations
  conversations: Conversation[] = [];
  selectedConversation: Conversation | null = null;

  // Reported Messages
  reportedMessages: ReportedMessage[] = [];

  // Support Chats
  supportChats: SupportChat[] = [];
  selectedSupportChat: SupportChat | null = null;

  // New message input
  newMessage: string = '';

  // Action modal
  showActionModal: boolean = false;
  actionType: 'warn' | 'flag' | 'mute' | 'block' | null = null;
  selectedUser: { id: string; name: string; role: string } | null = null;
  actionReason: string = '';

  // Warning modal
  showWarningModal: boolean = false;
  warningMessage: string = '';

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
    // Mock conversations data
    this.conversations = [
      {
        id: 'conv1',
        clientId: 'c1',
        clientName: 'Rahul Sharma',
        clientAvatar: 'RS',
        freelancerId: 'f1',
        freelancerName: 'Sarah Johnson',
        freelancerAvatar: 'SJ',
        projectTitle: 'E-commerce Website',
        lastMessage: 'Can we discuss the payment terms?',
        lastMessageTime: '2 min ago',
        unread: 2,
        isOnline: true,
        status: 'active',
        messages: [
          { id: 'm1', senderId: 'c1', senderName: 'Rahul Sharma', senderRole: 'client', text: 'Hi, I need help with the project.', time: '10:30 AM', isAdmin: false },
          { id: 'm2', senderId: 'admin', senderName: 'Admin', senderRole: 'admin', text: 'Hello! How can I assist you today?', time: '10:32 AM', isAdmin: true },
          { id: 'm3', senderId: 'c1', senderName: 'Rahul Sharma', senderRole: 'client', text: 'There is a dispute about the project delivery.', time: '10:35 AM', isAdmin: false },
          { id: 'm4', senderId: 'admin', senderName: 'Admin', senderRole: 'admin', text: 'I understand. Let me review the case.', time: '10:38 AM', isAdmin: true },
          { id: 'm5', senderId: 'c1', senderName: 'Rahul Sharma', senderRole: 'client', text: 'Can we discuss the payment terms?', time: '10:40 AM', isAdmin: false }
        ]
      },
      {
        id: 'conv2',
        clientId: 'c2',
        clientName: 'Priya Patel',
        clientAvatar: 'PP',
        freelancerId: 'f2',
        freelancerName: 'Michael Chen',
        freelancerAvatar: 'MC',
        projectTitle: 'Mobile App UI Design',
        lastMessage: 'Thank you for your help!',
        lastMessageTime: '1 hour ago',
        unread: 0,
        isOnline: false,
        status: 'resolved',
        messages: [
          { id: 'm6', senderId: 'c2', senderName: 'Priya Patel', senderRole: 'client', text: 'I need to report a freelancer.', time: '09:00 AM', isAdmin: false },
          { id: 'm7', senderId: 'admin', senderName: 'Admin', senderRole: 'admin', text: 'What is the issue?', time: '09:15 AM', isAdmin: true },
          { id: 'm8', senderId: 'c2', senderName: 'Priya Patel', senderRole: 'client', text: 'They are not responding to messages.', time: '09:20 AM', isAdmin: false },
          { id: 'm9', senderId: 'admin', senderName: 'Admin', senderRole: 'admin', text: 'I will look into this and take necessary action.', time: '09:25 AM', isAdmin: true },
          { id: 'm10', senderId: 'c2', senderName: 'Priya Patel', senderRole: 'client', text: 'Thank you for your help!', time: '09:30 AM', isAdmin: false }
        ]
      },
      {
        id: 'conv3',
        clientId: 'c3',
        clientName: 'Amit Kumar',
        clientAvatar: 'AK',
        freelancerId: 'f3',
        freelancerName: 'Emily Davis',
        freelancerAvatar: 'ED',
        projectTitle: 'SEO Optimization',
        lastMessage: 'The project has been flagged for review.',
        lastMessageTime: 'Yesterday',
        unread: 1,
        isOnline: true,
        status: 'reported',
        messages: [
          { id: 'm11', senderId: 'f3', senderName: 'Emily Davis', senderRole: 'freelancer', text: 'The client is asking for inappropriate content.', time: 'Yesterday', isAdmin: false, isReported: true, reportReason: 'Inappropriate content request' },
          { id: 'm12', senderId: 'admin', senderName: 'Admin', senderRole: 'admin', text: 'Thank you for reporting. We will investigate.', time: 'Yesterday', isAdmin: true },
          { id: 'm13', senderId: 'admin', senderName: 'Admin', senderRole: 'admin', text: 'The project has been flagged for review.', time: 'Yesterday', isAdmin: true }
        ]
      },
      {
        id: 'conv4',
        clientId: 'c4',
        clientName: 'Sneha Gupta',
        clientAvatar: 'SG',
        freelancerId: 'f4',
        freelancerName: 'Alex Rivera',
        freelancerAvatar: 'AR',
        projectTitle: 'WordPress Development',
        lastMessage: 'Need mediation on payment release.',
        lastMessageTime: '2 days ago',
        unread: 0,
        isOnline: true,
        status: 'disputed',
        messages: [
          { id: 'm14', senderId: 'f4', senderName: 'Alex Rivera', senderRole: 'freelancer', text: 'Client refuses to release payment.', time: '2 days ago', isAdmin: false },
          { id: 'm15', senderId: 'c4', senderName: 'Sneha Gupta', senderRole: 'client', text: 'Work was not completed as per requirements.', time: '2 days ago', isAdmin: false },
          { id: 'm16', senderId: 'admin', senderName: 'Admin', senderRole: 'admin', text: 'I will review the project deliverables.', time: '2 days ago', isAdmin: true },
          { id: 'm17', senderId: 'f4', senderName: 'Alex Rivera', senderRole: 'freelancer', text: 'Need mediation on payment release.', time: '2 days ago', isAdmin: false }
        ]
      }
    ];

    // Mock reported messages
    this.reportedMessages = [
      {
        id: 'rep1',
        conversationId: 'conv3',
        messageId: 'm11',
        reportedBy: 'Emily Davis',
        reportedAt: 'Yesterday',
        reason: 'Inappropriate content request',
        messageText: 'The client is asking for inappropriate content.',
        senderName: 'Amit Kumar',
        senderRole: 'client',
        status: 'pending'
      },
      {
        id: 'rep2',
        conversationId: 'conv1',
        messageId: 'm5',
        reportedBy: 'Sarah Johnson',
        reportedAt: '3 hours ago',
        reason: 'Harassment',
        messageText: 'Unprofessional behavior in messages.',
        senderName: 'Rahul Sharma',
        senderRole: 'client',
        status: 'pending'
      }
    ];

    // Mock support chats
    this.supportChats = [
      {
        id: 'sup1',
        userId: 'c1',
        userName: 'Rahul Sharma',
        userRole: 'client',
        userAvatar: 'RS',
        subject: 'Payment Issue',
        lastMessage: 'How do I request a refund?',
        lastMessageTime: '10 min ago',
        unread: 1,
        status: 'open',
        messages: [
          { id: 'supm1', senderId: 'c1', senderName: 'Rahul Sharma', senderRole: 'client', text: 'Hello, I need help with a payment issue.', time: '10:30 AM', isAdmin: false },
          { id: 'supm2', senderId: 'admin', senderName: 'Admin', senderRole: 'admin', text: 'Hi! How can I assist you?', time: '10:32 AM', isAdmin: true },
          { id: 'supm3', senderId: 'c1', senderName: 'Rahul Sharma', senderRole: 'client', text: 'How do I request a refund?', time: '10:35 AM', isAdmin: false }
        ]
      },
      {
        id: 'sup2',
        userId: 'f2',
        userName: 'Michael Chen',
        userRole: 'freelancer',
        userAvatar: 'MC',
        subject: 'Account Verification',
        lastMessage: 'When will my account be verified?',
        lastMessageTime: '2 hours ago',
        unread: 0,
        status: 'pending',
        messages: [
          { id: 'supm4', senderId: 'f2', senderName: 'Michael Chen', senderRole: 'freelancer', text: 'I submitted my documents yesterday.', time: '08:00 AM', isAdmin: false },
          { id: 'supm5', senderId: 'admin', senderName: 'Admin', senderRole: 'admin', text: 'We are reviewing your documents.', time: '08:30 AM', isAdmin: true },
          { id: 'supm6', senderId: 'f2', senderName: 'Michael Chen', senderRole: 'freelancer', text: 'When will my account be verified?', time: '10:00 AM', isAdmin: false }
        ]
      }
    ];
  }

  // Filter conversations
  get filteredConversations(): Conversation[] {
    let filtered = this.conversations;

    // Filter by status
    if (this.filterStatus !== 'all') {
      filtered = filtered.filter(c => c.status === this.filterStatus);
    }

    // Filter by search query
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.clientName.toLowerCase().includes(query) ||
        c.freelancerName.toLowerCase().includes(query) ||
        c.projectTitle.toLowerCase().includes(query)
      );
    }

    return filtered;
  }

  // Select a conversation
  selectConversation(conversation: Conversation): void {
    this.selectedConversation = conversation;
    conversation.unread = 0;
    this.selectedSupportChat = null;
  }

  // Select a support chat
  selectSupportChat(chat: SupportChat): void {
    this.selectedSupportChat = chat;
    chat.unread = 0;
    this.selectedConversation = null;
  }

  // Send message in conversation
  sendMessage(): void {
    if (this.newMessage.trim() && this.selectedConversation) {
      const message: Message = {
        id: Date.now().toString(),
        senderId: 'admin',
        senderName: 'Admin',
        senderRole: 'admin',
        text: this.newMessage.trim(),
        time: this.getCurrentTime(),
        isAdmin: true
      };

      this.selectedConversation.messages.push(message);
      this.selectedConversation.lastMessage = this.newMessage.trim();
      this.selectedConversation.lastMessageTime = 'Just now';
      this.newMessage = '';
    }
  }

  // Send message in support chat
  sendSupportMessage(): void {
    if (this.newMessage.trim() && this.selectedSupportChat) {
      const message: Message = {
        id: Date.now().toString(),
        senderId: 'admin',
        senderName: 'Admin',
        senderRole: 'admin',
        text: this.newMessage.trim(),
        time: this.getCurrentTime(),
        isAdmin: true
      };

      this.selectedSupportChat.messages.push(message);
      this.selectedSupportChat.lastMessage = this.newMessage.trim();
      this.selectedSupportChat.lastMessageTime = 'Just now';
      this.newMessage = '';
    }
  }

  // Get current time
  getCurrentTime(): string {
    const now = new Date();
    return now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  // Open action modal
  openActionModal(type: 'warn' | 'flag' | 'mute' | 'block', user: { id: string; name: string; role: string }): void {
    this.actionType = type;
    this.selectedUser = user;
    this.showActionModal = true;
    this.actionReason = '';
  }

  // Close action modal
  closeActionModal(): void {
    this.showActionModal = false;
    this.actionType = null;
    this.selectedUser = null;
    this.actionReason = '';
  }

  // Submit action
  submitAction(): void {
    if (!this.actionReason.trim()) {
      alert('Please provide a reason for this action.');
      return;
    }

    alert(`${this.actionType?.toUpperCase()} action taken against ${this.selectedUser?.name}. Reason: ${this.actionReason}`);
    this.closeActionModal();
  }

  // Open warning modal
  openWarningModal(): void {
    if (!this.selectedConversation) return;
    this.showWarningModal = true;
    this.warningMessage = '';
  }

  // Close warning modal
  closeWarningModal(): void {
    this.showWarningModal = false;
    this.warningMessage = '';
  }

  // Send warning
  sendWarning(): void {
    if (!this.warningMessage.trim()) {
      alert('Please enter a warning message.');
      return;
    }

    if (this.selectedConversation) {
      const warningMsg: Message = {
        id: Date.now().toString(),
        senderId: 'admin',
        senderName: 'Admin',
        senderRole: 'admin',
        text: `⚠️ WARNING: ${this.warningMessage}`,
        time: this.getCurrentTime(),
        isAdmin: true
      };
      this.selectedConversation.messages.push(warningMsg);
    }

    this.closeWarningModal();
  }

  // Mark conversation as resolved
  markAsResolved(): void {
    if (this.selectedConversation) {
      this.selectedConversation.status = 'resolved';
      alert('Conversation marked as resolved.');
    }
  }

  // Review reported message
  reviewReportedMessage(report: ReportedMessage): void {
    report.status = 'reviewed';
    alert(`Reported message from ${report.senderName} has been reviewed.`);
  }

  // Take action on reported message
  actionOnReportedMessage(report: ReportedMessage): void {
    report.status = 'action_taken';
    alert(`Action taken on reported message from ${report.senderName}.`);
  }

  // Resolve support chat
  resolveSupportChat(): void {
    if (this.selectedSupportChat) {
      this.selectedSupportChat.status = 'resolved';
      alert('Support chat marked as resolved.');
    }
  }

  // View reported messages in conversation
  viewReportedInConversation(report: ReportedMessage): void {
    const conversation = this.conversations.find(c => c.id === report.conversationId);
    if (conversation) {
      this.selectConversation(conversation);
    }
  }

  // Get unread count
  get totalUnreadCount(): number {
    const convUnread = this.conversations.reduce((sum, c) => sum + c.unread, 0);
    const supportUnread = this.supportChats.reduce((sum, c) => sum + c.unread, 0);
    return convUnread + supportUnread;
  }

  // Get reported count
  get reportedCount(): number {
    return this.reportedMessages.filter(r => r.status === 'pending').length;
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

