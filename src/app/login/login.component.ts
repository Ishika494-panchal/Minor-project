import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { User } from '../models/user.model';
import { API_BASE_URL } from '../services/api.config';

interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  passwordVisible = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { email, password, rememberMe } = this.loginForm.value;

    this.http.post<AuthResponse>(`${API_BASE_URL}/api/auth/login`, { email, password }).subscribe({
      next: (response) => {
        if (response.success && response.user && response.token) {
          this.handleLoginSuccess(response.user.role, rememberMe, response.token, response.user);
          return;
        }
        this.isLoading = false;
        this.errorMessage = response.message || 'Login failed';
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error?.error?.message || 'Login failed';
      }
    });
  }

  private handleLoginSuccess(role: string, rememberMe: boolean, token: string, user: User): void {
    // Clear stale auth from both storages to avoid token/user mismatch.
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');

    // Store token and user info
    if (rememberMe) {
      localStorage.setItem('authToken', token);
      localStorage.setItem('userData', JSON.stringify(user));
    } else {
      sessionStorage.setItem('authToken', token);
      sessionStorage.setItem('userData', JSON.stringify(user));
    }

    this.isLoading = false;

    // Redirect based on role
    switch (role) {
      case 'client':
        this.router.navigate(['/client-dashboard']);
        break;
      case 'freelancer':
        this.router.navigate(['/freelancer-dashboard']);
        break;
      case 'admin':
        this.router.navigate(['/admin-dashboard']);
        break;
      default:
        this.router.navigate(['/client-dashboard']);
    }
  }

  onForgotPassword(): void {
    // Navigate to forgot password page
    console.log('Navigate to forgot password');
  }

  goToLanding(): void {
    this.router.navigate(['/landing']);
  }

  onSignup(): void {
    // Navigate to signup page
    this.router.navigate(['/signup']);
  }

  // Getter for easy access in template
  get f() {
    return this.loginForm.controls;
  }
}

