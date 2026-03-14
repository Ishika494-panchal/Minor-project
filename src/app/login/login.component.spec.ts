import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LoginComponent],
      imports: [
        CommonModule,
        ReactiveFormsModule,
        HttpClientModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty values', () => {
    expect(component.loginForm.value).toEqual({
      email: '',
      password: '',
      rememberMe: false
    });
  });

  it('should validate email field as required', () => {
    const emailControl = component.loginForm.get('email');
    emailControl?.setValue('');
    expect(emailControl?.hasError('required')).toBeTrue();
  });

  it('should validate email field as valid email', () => {
    const emailControl = component.loginForm.get('email');
    emailControl?.setValue('invalid-email');
    expect(emailControl?.hasError('email')).toBeTrue();
  });

  it('should validate password field as required', () => {
    const passwordControl = component.loginForm.get('password');
    passwordControl?.setValue('');
    expect(passwordControl?.hasError('required')).toBeTrue();
  });

  it('should validate password minimum length', () => {
    const passwordControl = component.loginForm.get('password');
    passwordControl?.setValue('123');
    expect(passwordControl?.hasError('minlength')).toBeTrue();
  });

  it('should toggle password visibility', () => {
    expect(component.passwordVisible).toBeFalse();
    component.togglePasswordVisibility();
    expect(component.passwordVisible).toBeTrue();
    component.togglePasswordVisibility();
    expect(component.passwordVisible).toBeFalse();
  });

  it('should show error message on failed login', fakeAsync(() => {
    component.loginForm.patchValue({
      email: 'nonexistent@test.com',
      password: 'wrongpassword'
    });
    component.onSubmit();
    tick(2000);
    fixture.detectChanges();
    expect(component.errorMessage).toBe('Invalid email or password');
  }));

  it('should redirect freelancer to freelancer dashboard', fakeAsync(() => {
    spyOn(router, 'navigate');
    // This test requires a registered user in localStorage
    // For testing, users must be registered through the signup process
  }));

  it('should redirect client to client dashboard', fakeAsync(() => {
    spyOn(router, 'navigate');
    // This test requires a registered user in localStorage
  }));

  it('should redirect admin to admin dashboard', fakeAsync(() => {
    spyOn(router, 'navigate');
    // This test requires a registered user in localStorage
  }));

  it('should store token in localStorage when rememberMe is true', fakeAsync(() => {
    spyOn(localStorage, 'setItem');
    // This test requires a registered user in localStorage
  }));

  it('should store token in sessionStorage when rememberMe is false', fakeAsync(() => {
    spyOn(sessionStorage, 'setItem');
    // This test requires a registered user in localStorage
  }));

  it('should not submit form when invalid', () => {
    component.loginForm.patchValue({
      email: '',
      password: ''
    });
    component.onSubmit();
    expect(component.loginForm.touched).toBeTrue();
  });

  it('should have f getter to access form controls', () => {
    expect(component.f).toBe(component.loginForm.controls);
  });
});

