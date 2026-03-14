import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { User } from '../models/user.model';

interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
}

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent implements OnInit {
  signupForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  passwordVisible = false;
  confirmPasswordVisible = false;

  // Role options
  roles = [
    { value: 'client', label: 'Client', description: 'I want to hire freelancers for projects' },
    { value: 'freelancer', label: 'Freelancer', description: 'I want to work on projects and earn money' }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.signupForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      role: ['', [Validators.required]],
      agreeToTerms: [false, [Validators.requiredTrue]]
    }, {
      validators: this.passwordMatchValidator
    });

    // Check for role query parameter from landing page
    this.route.queryParams.subscribe(params => {
      if (params['role']) {
        this.selectRole(params['role']);
      }
    });
  }

  // Custom validator for password matching
  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordVisible = !this.confirmPasswordVisible;
  }

  onSubmit(): void {
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formValue = this.signupForm.value;
    const fullName: string = formValue.fullName;
    const email: string = formValue.email;
    const password: string = formValue.password;
    const role: string = formValue.role || 'client';

    this.http.post<AuthResponse>('http://localhost:3000/api/auth/register', { fullName, email, password, role }).subscribe({
      next: (response) => {
        if (!response.success || !response.user || !response.token) {
          this.isLoading = false;
          this.errorMessage = response.message || 'Registration failed';
          return;
        }

        this.isLoading = false;
        this.successMessage = 'Account created successfully! Redirecting to your dashboard...';

        // Auto login after registration - store token and redirect
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('userData');
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('userData', JSON.stringify(response.user));

        // Redirect to role-specific dashboard after 2 seconds
        setTimeout(() => {
          if (role === 'client') {
            this.router.navigate(['/client-dashboard']);
          } else if (role === 'freelancer') {
            this.router.navigate(['/freelancer-dashboard']);
          } else {
            this.router.navigate(['/login']);
          }
        }, 2000);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error?.error?.message || 'Registration failed';
      }
    });
  }

  onLogin(): void {
    // Navigate to login page
    this.router.navigate(['/login']);
  }

  goToLanding(): void {
    this.router.navigate(['/landing']);
  }

  selectRole(role: string): void {
    this.signupForm.patchValue({ role: role });
  }

  // Getter for easy access in template
  get f() {
    return this.signupForm.controls;
  }
}

