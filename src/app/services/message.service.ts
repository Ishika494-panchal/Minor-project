import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { tap } from 'rxjs/operators';
import { NotificationItem } from './notification.service';
import { API_BASE_URL, SOCKET_BASE_URL } from './api.config';

export interface ChatMessage {
  _id: string;
  conversationId: string;
  senderId: {
    _id: string;
    fullName: string;
    email: string;
    profileImage?: string;
  };
  receiverId: {
    _id: string;
    fullName: string;
    email: string;
    profileImage?: string;
  };
  projectId?: string | null;
  orderId?: string;
  messageType: 'text' | 'image' | 'file' | 'delivery_submission' | 'revision_request' | 'payment_update' | 'system_notice';
  textContent: string;
  attachment?: {
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    fileData?: string;
    fileUrl?: string;
    thumbnailUrl?: string;
    uploadedAt?: string;
  };
  deliveryStatus: 'sent' | 'delivered' | 'read';
  isRead: boolean;
  readAt?: string | null;
  isEdited?: boolean;
  editedAt?: string | null;
  isDeleted?: boolean;
  deletedAt?: string | null;
  createdAt: string;
}

export interface ChatConversation {
  id: string;
  conversationType: 'project' | 'order' | 'support' | 'dispute' | 'direct';
  status: 'active' | 'completed' | 'disputed' | 'archived' | 'blocked';
  projectId: string | null;
  projectTitle: string;
  orderId: string;
  partner: {
    id: string;
    fullName: string;
    email: string;
    profileImage?: string;
  };
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface EnsureConversationPayload {
  partnerId: string;
  projectId?: string | null;
  orderId?: string;
  conversationType?: 'project' | 'order' | 'support' | 'dispute' | 'direct';
}

export interface SendMessagePayload {
  textContent?: string;
  messageType?: 'text' | 'image' | 'file' | 'delivery_submission' | 'revision_request' | 'payment_update' | 'system_notice';
  attachment?: {
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    fileData?: string;
    fileUrl?: string;
    thumbnailUrl?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private baseUrl = `${API_BASE_URL}/api`;
  private socket: Socket | null = null;
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  private conversationsSubject = new BehaviorSubject<ChatConversation[]>([]);
  private socketMessageSubject = new BehaviorSubject<ChatMessage | null>(null);
  private conversationRefreshSubject = new BehaviorSubject<string | null>(null);
  private readReceiptSubject = new BehaviorSubject<{ conversationId: string; readBy: string } | null>(null);
  private socketNotificationSubject = new BehaviorSubject<NotificationItem | null>(null);
  private socketNotificationCountSubject = new BehaviorSubject<number | null>(null);
  public messages$ = this.messagesSubject.asObservable();
  public conversations$ = this.conversationsSubject.asObservable();
  public socketMessage$ = this.socketMessageSubject.asObservable();
  public conversationRefresh$ = this.conversationRefreshSubject.asObservable();
  public readReceipt$ = this.readReceiptSubject.asObservable();
  public socketNotification$ = this.socketNotificationSubject.asObservable();
  public socketNotificationCount$ = this.socketNotificationCountSubject.asObservable();

  constructor(private http: HttpClient) {}

  connect(token: string) {
    if (this.socket?.connected) {
      return;
    }
    this.socket = io(SOCKET_BASE_URL, {
      auth: { token }
    });

    this.socket.on('connect', () => {
      console.log('Connected to chat server');
    });

    this.socket.on('chat:message:new', (data: { message: ChatMessage }) => {
      if (!data?.message) return;
      this.socketMessageSubject.next(data.message);
    });

    this.socket.on('chat:conversation:update', (data: { conversationId: string }) => {
      if (!data?.conversationId) return;
      this.conversationRefreshSubject.next(data.conversationId);
    });

    this.socket.on('chat:message:read', (data: { conversationId: string; readBy: string }) => {
      if (!data?.conversationId) return;
      this.readReceiptSubject.next(data);
    });

    this.socket.on('notification:new', (data: NotificationItem) => {
      if (!data?.id) return;
      this.socketNotificationSubject.next(data);
    });

    this.socket.on('notification:count', (data: { unreadCount: number }) => {
      if (typeof data?.unreadCount !== 'number') return;
      this.socketNotificationCountSubject.next(data.unreadCount);
    });

    this.socket.on('connect_error', (err) => {
      console.error('Socket connect error:', err);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinRoom(roomId: string) {
    if (this.socket) {
      this.socket.emit('chat:conversation:open', { conversationId: roomId });
    }
  }

  getConversations(): Observable<{ success: boolean; conversations: ChatConversation[] }> {
    const token = this.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return this.http.get<{ success: boolean; conversations: ChatConversation[] }>(
      `${this.baseUrl}/messages/conversations`,
      { headers }
    ).pipe(
      tap((res) => {
        if (res?.success && Array.isArray(res.conversations)) {
          this.setConversations(res.conversations);
        }
      })
    );
  }

  ensureConversation(payload: EnsureConversationPayload): Observable<any> {
    const token = this.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return this.http.post(`${this.baseUrl}/messages/conversations/ensure`, payload, { headers });
  }

  getMessages(conversationId: string, limit = 50, before = ''): Observable<{ success: boolean; messages: ChatMessage[]; hasMore: boolean }> {
    const token = this.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (before) params.set('before', before);
    return this.http.get<{ success: boolean; messages: ChatMessage[]; hasMore: boolean }>(
      `${this.baseUrl}/messages/conversations/${conversationId}/messages?${params.toString()}`,
      { headers }
    ).pipe(
      tap((res) => {
        if (res?.success && Array.isArray(res.messages)) {
          this.setMessages(res.messages);
        }
      })
    );
  }

  sendMessage(conversationId: string, payload: SendMessagePayload): Observable<{ success: boolean; message: ChatMessage }> {
    const token = this.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return this.http.post<{ success: boolean; message: ChatMessage }>(
      `${this.baseUrl}/messages/conversations/${conversationId}/messages`,
      payload,
      { headers }
    );
  }

  markAsRead(conversationId: string): Observable<any> {
    const token = this.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
    return this.http.put(`${this.baseUrl}/messages/conversations/${conversationId}/read`, {}, { headers });
  }

  private getToken(): string {
    const rawToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
    return rawToken.replace(/^"(.*)"$/, '$1').trim();
  }

  setMessages(messages: ChatMessage[]) {
    this.messagesSubject.next(messages);
  }

  setConversations(conversations: ChatConversation[]) {
    this.conversationsSubject.next(conversations);
  }
}
