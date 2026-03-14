import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LandingComponent } from './landing.component';
import { Router } from '@angular/router';
import { By } from '@angular/platform-browser';

describe('LandingComponent', () => {
  let component: LandingComponent;
  let fixture: ComponentFixture<LandingComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LandingComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate to signup with freelancer role', () => {
    const spy = spyOn(router, 'navigate');
    component.navigateToSignup('freelancer');
    expect(spy).toHaveBeenCalledWith(['/signup'], { queryParams: { role: 'freelancer' } });
  });

  it('should navigate to signup with client role', () => {
    const spy = spyOn(router, 'navigate');
    component.navigateToSignup('client');
    expect(spy).toHaveBeenCalledWith(['/signup'], { queryParams: { role: 'client' } });
  });

  it('should navigate to login', () => {
    const spy = spyOn(router, 'navigate');
    component.navigateToLogin();
    expect(spy).toHaveBeenCalledWith(['/login']);
  });
});

