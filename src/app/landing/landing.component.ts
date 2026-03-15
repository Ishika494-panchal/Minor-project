import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  @ViewChild('heroVideo') heroVideoRef?: ElementRef<HTMLVideoElement>;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private router: Router) {}

  ngAfterViewInit(): void {
    this.tryPlayVideo();
  }

  navigateToSignup(role: string): void {
    this.router.navigate(['/signup'], { queryParams: { role: role } });
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  onHeroVideoReady(): void {
    this.tryPlayVideo();
  }

  onHeroVideoStalled(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
    this.retryTimer = setTimeout(() => {
      this.tryPlayVideo();
    }, 300);
  }

  onHeroVideoError(): void {
    const video = this.heroVideoRef?.nativeElement;
    if (!video) return;
    video.style.display = 'none';
  }

  ngOnDestroy(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private tryPlayVideo(): void {
    const video = this.heroVideoRef?.nativeElement;
    if (!video) return;
    // Enforce silent background playback across browsers.
    video.defaultMuted = true;
    video.muted = true;
    video.volume = 0;
    if (video.paused) {
      video.play().catch(() => {
        // Ignore autoplay promise rejection on strict browsers.
      });
    }
  }
}

