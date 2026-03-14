import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { getMockFreelancers } from '../../../services/mock-data.service';

export interface Freelancer {
  id: string;
  fullName: string;
  email: string;
  profilePicture: string;
  skills: string[];
  category: string;
  bio: string;
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  location: string;
  completedProjects: number;
  memberSince: string;
  languages: string[];
  portfolio: string[];
}

export interface FilterOptions {
  search: string;
  category: string;
  minRating: number;
  minPrice: number;
  maxPrice: number;
}

@Component({
  selector: 'app-find-freelancers',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './find-freelancers.component.html',
  styleUrls: ['./find-freelancers.component.css']
})
export class FindFreelancersComponent implements OnInit {
  userData: any = null;
  freelancers: Freelancer[] = [];
  filteredFreelancers: Freelancer[] = [];
  categories: string[] = [];
  
  // Filter values
  searchTerm: string = '';
  selectedCategory: string = 'All';
  minRating: number = 0;
  minPrice: number = 0;
  maxPrice: number = 200;
  
  // Rating options
  ratingOptions = [
    { value: 0, label: 'Any Rating' },
    { value: 4.5, label: '4.5+' },
    { value: 4.0, label: '4.0+' },
    { value: 3.5, label: '3.5+' },
    { value: 3.0, label: '3.0+' }
  ];
  
  // Price range options
  priceRanges = [
    { min: 0, max: 200, label: 'Any Price' },
    { min: 0, max: 2500, label: 'Under ₹2,500/hr' },
    { min: 2500, max: 4200, label: '₹2,500 - ₹4,200/hr' },
    { min: 4200, max: 6300, label: '₹4,200 - ₹6,300/hr' },
    { min: 6300, max: 8400, label: '₹6,300 - ₹8,400/hr' },
    { min: 8400, max: 20000, label: '₹8,400+/hr' }
  ];
  
  selectedPriceRange: { min: number; max: number; label: string } = this.priceRanges[0];
  
  // Selected freelancer for modal
  selectedFreelancer: Freelancer | null = null;
  showFreelancerModal: boolean = false;

  constructor(
    private router: Router
  ) {}

  ngOnInit(): void {
    const userDataStr = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    if (userDataStr) {
      this.userData = JSON.parse(userDataStr);
      this.loadFreelancers();
    } else {
      this.router.navigate(['/login']);
    }
  }

  loadFreelancers(): void {
    // Load freelancers from service (which will eventually connect to backend API)
    this.freelancers = getMockFreelancers();
    
    // Get unique categories
    const uniqueCategories = this.freelancers.map(f => f.category);
    this.categories = ['All', ...new Set(uniqueCategories)];
    
    this.applyFilters();
  }

  applyFilters(): void {
    // Filter freelancers based on search and filter criteria
    this.filteredFreelancers = this.freelancers.filter(freelancer => {
      // Search filter
      if (this.searchTerm) {
        const searchLower = this.searchTerm.toLowerCase();
        const matchesName = freelancer.fullName.toLowerCase().includes(searchLower);
        const matchesSkills = freelancer.skills.some(s => s.toLowerCase().includes(searchLower));
        const matchesCategory = freelancer.category.toLowerCase().includes(searchLower);
        if (!matchesName && !matchesSkills && !matchesCategory) {
          return false;
        }
      }
      
      // Category filter
      if (this.selectedCategory && this.selectedCategory !== 'All') {
        if (freelancer.category !== this.selectedCategory) {
          return false;
        }
      }
      
      // Rating filter
      if (this.minRating > 0) {
        if (freelancer.rating < this.minRating) {
          return false;
        }
      }
      
      // Price range filter
      if (this.minPrice > 0) {
        if (freelancer.hourlyRate < this.minPrice) {
          return false;
        }
      }
      
      if (this.maxPrice > 0 && this.maxPrice < 200) {
        if (freelancer.hourlyRate > this.maxPrice) {
          return false;
        }
      }
      
      return true;
    });
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onCategoryChange(): void {
    this.applyFilters();
  }

  onRatingChange(): void {
    this.applyFilters();
  }

  onPriceRangeChange(): void {
    this.minPrice = this.selectedPriceRange.min;
    this.maxPrice = this.selectedPriceRange.max;
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = 'All';
    this.minRating = 0;
    this.selectedPriceRange = this.priceRanges[0];
    this.minPrice = 0;
    this.maxPrice = 200;
    this.applyFilters();
  }

  viewProfile(freelancer: Freelancer): void {
    this.selectedFreelancer = freelancer;
    this.showFreelancerModal = true;
  }

  closeModal(): void {
    this.showFreelancerModal = false;
    this.selectedFreelancer = null;
  }

  hireFreelancer(freelancer: Freelancer): void {
    alert(`Invitation sent to ${freelancer.fullName}! They will be notified of your project opportunity.`);
    this.closeModal();
  }

  messageFreelancer(freelancer: Freelancer | null): void {
    if (!freelancer) {
      return;
    }

    this.router.navigate(['/client-messages'], {
      queryParams: {
        partnerId: freelancer.id,
        partnerName: freelancer.fullName
      }
    });
    this.closeModal();
  }

  getStarRating(rating: number): string[] {
    const stars: string[] = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push('fas fa-star');
    }
    if (hasHalfStar) {
      stars.push('fas fa-star-half-alt');
    }
    while (stars.length < 5) {
      stars.push('far fa-star');
    }
    return stars;
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    this.router.navigate(['/login']);
  }
}

