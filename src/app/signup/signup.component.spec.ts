import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SignupComponent } from './signup.component';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { By } from '@angular/platform-browser';

describe('SignupComponent', () => {
  let component: SignupComponent;
  let fixture: ComponentFixture<SignupComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignupComponent, ReactiveFormsModule, HttpClientModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SignupComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize the form with empty fields', () => {
    expect(component.signupForm).toBeDefined();
    expect(component.signupForm.get('fullName')?.value).toBe('');
    expect(component.signupForm.get('email')?.value).toBe('');
    expect(component.signupForm.get('password')?.value).toBe('');
    expect(component.signupForm.get('confirmPassword')?.value).toBe('');
    expect(component.signupForm.get('role')?.value).toBe('');
    expect(component.signupForm.get('agreeToTerms')?.value).toBe(false);
  });

  it('should validate fullName is required', () => {
    const fullName = component.signupForm.get('fullName');
    fullName?.setValue('');
    expect(fullName?.hasError('required')).toBeTruthy();
  });

  it('should validate email is required and valid', () => {
    const email = component.signupForm.get('email');
    email?.setValue('');
    expect(email?.hasError('required')).toBeTruthy();
    
    email?.setValue('invalid-email');
    expect(email?.hasError('email')).toBeTruthy();
  });

  it('should validate password is required and min length 8', () => {
    const password = component.signupForm.get('password');
    password?.setValue('');
    expect(password?.hasError('required')).toBeTruthy();
    
    password?.setValue('1234567');
    expect(password?.hasError('minlength')).toBeTruthy();
  });

  it('should validate passwords match', () => {
    component.signupForm.patchValue({
      password: 'password123',
      confirmPassword: 'differentpassword'
    });
    expect(component.signupForm.hasError('passwordMismatch')).toBeTruthy();
    
    component.signupForm.patchValue({
      confirmPassword: 'password123'
    });
    expect(component.signupForm.hasError('passwordMismatch')).toBeFalsy();
  });

  it('should validate role is required', () => {
    const role = component.signupForm.get('role');
    role?.setValue('');
    expect(role?.hasError('required')).toBeTruthy();
  });

  it('should validate agreeToTerms must be checked', () => {
    const agreeToTerms = component.signupForm.get('agreeToTerms');
    agreeToTerms?.setValue(false);
    expect(agreeToTerms?.hasError('required')).toBeTruthy();
  });

  it('should toggle password visibility', () => {
    expect(component.passwordVisible).toBe(false);
    component.togglePasswordVisibility();
    expect(component.passwordVisible).toBe(true);
    component.togglePasswordVisibility();
    expect(component.passwordVisible).toBe(false);
  });

  it('should toggle confirm password visibility', () => {
    expect(component.confirmPasswordVisible).toBe(false);
    component.toggleConfirmPasswordVisibility();
    expect(component.confirmPasswordVisible).toBe(true);
    component.toggleConfirmPasswordVisibility();
    expect(component.confirmPasswordVisible).toBe(false);
  });

  it('should select role correctly', () => {
    component.selectRole('freelancer');
    expect(component.signupForm.get('role')?.value).toBe('freelancer');
    
    component.selectRole('client');
    expect(component.signupForm.get('role')?.value).toBe('client');
  });

  it('should show error when form is submitted empty', () => {
    component.onSubmit();
    expect(component.signupForm.touched).toBe(true);
    expect(component.signupForm.invalid).toBe(true);
  });

  it('should navigate to login on onLogin', () => {
    const spy = spyOn(router, 'navigate');
    component.onLogin();
    expect(spy).toHaveBeenCalledWith(['/login']);
  });
});

