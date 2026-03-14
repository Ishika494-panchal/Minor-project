import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { Router } from '@angular/router';

export interface Message {
  _id: string;
  senderId: {
    _id: string;
    fullName: string;
    email: string;
    profilePicture?: string;
  };
  receiverId: {
    _id: string;
    fullName: string;
    email: string;
    profilePicture?: string;
  };
  content: string;
  projectId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Conversation {
  partner: {
    id: string;
    fullName: string;
    email: string;
    profilePicture?: string;
  };
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private baseUrl = 'http://localhost:3000/api';
  private socket: Socket | null = null;
  private messagesSubject = new BehaviorSubject<Message[]>([]);
  private conversationsSubject = new BehaviorSubject<Conversation[]>([]);
  public messages$ = this.messagesSubject.asObservable();
  public conversations$ = this.conversationsSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  connect(token: string, userId: string) {
    this.socket = io('http://localhost:3000', {
      auth: { token }
    });

    this.socket.on('connect', () => {
      console.log('Connected to chat server');
    });

    this.socket.on('newMessage', (data) => {
      const currentMessages = this.messagesSubject.value;
      this.messagesSubject.next([...currentMessages, data.message]);
    });

    this.socket.on('messageSent', (data) => {
      console.log('Message sent:', data);
    });

    this.socket.on('error', (err) => {
      console.error('Socket error:', err);
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
      this.socket.emit('joinRoom', roomId);
    }
  }

  leaveRoom(roomId: string) {
    if (this.socket) {
      this.socket.emit('leaveRoom', roomId);
    }
  }

  sendMessage(receiverId: string, content: string, projectId?: string, roomId?: string): void {
    if (this.socket) {
      this.socket.emit('sendMessage', { 
        receiverId, 
        content, 
        projectId, 
        roomId 
      });
    }
  }

  getConversations(userId: string): Observable<any> {
    const token = this.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return this.http.get(`${this.baseUrl}/messages/conversations/${userId}`, { headers });
  }

  getMessages(userId: string, partnerId: string): Observable<any> {
    const token = this.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return this.http.get(`${this.baseUrl}/messages/${userId}/${partnerId}`, { headers });
  }

  markAsRead(partnerId: string): Observable<any> {
    const token = this.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return this.http.put(`${this.baseUrl}/messages/read/${partnerId}`, {}, { headers });
  }

  private getToken(): string {
    const rawToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
    return rawToken.replace(/^"(.*)"$/, '$1').trim();
  }

  setMessages(messages: Message[]) {
    this.messagesSubject.next(messages);
  }

  setConversations(conversations: Conversation[]) {
    this.conversationsSubject.next(conversations);
  }

  getRoomId(userId1: string, userId2: string, projectId?: string): string {
    const ids = [userId1, userId2].sort();
    return projectId ? `project_${projectId}` : `chat_${ids[0]}_${ids[1]}`;
  }
}
