import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

export interface ClientProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  profilePicture: string;
  bio: string;
  companyName: string;
  industry: string;
  website: string;
  memberSince: string;
  totalProjectsPosted: number;
  totalFreelancersHired: number;
}

@Component({
  selector: 'app-client-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './client-profile.component.html',
  styleUrls: ['./client-profile.component.css']
})
export class ClientProfileComponent implements OnInit {
  userData: any = null;
  profile: ClientProfile | null = null;
  isEditing: boolean = false;
  selectedFile: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;

  constructor(
    private router: Router
  ) {}

  ngOnInit(): void {
    const userDataStr = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    if (userDataStr) {
      this.userData = JSON.parse(userDataStr);
      this.loadProfile();
    } else {
      this.router.navigate(['/login']);
    }
  }

  loadProfile(): void {
    // Use actual user data from localStorage/sessionStorage
    if (this.userData) {
      this.profile = {
        id: this.userData.id || '',
        fullName: this.userData.fullName || 'Not provided',
        email: this.userData.email || 'Not provided',
        phone: this.userData.phone || 'Not provided',
        location: this.userData.location || 'Not provided',
        profilePicture: this.userData.profilePicture || 'assets/client.jpeg',
        bio: this.userData.bio || 'No bio provided',
        companyName: this.userData.companyName || 'Not provided',
        industry: this.userData.industry || 'Not provided',
        website: this.userData.website || '',
        memberSince: this.userData.memberSince || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        totalProjectsPosted: this.userData.totalProjectsPosted || 0,
        totalFreelancersHired: this.userData.totalFreelancersHired || 0
      };
    }
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    // Reset image preview when closing modal
    if (!this.isEditing) {
      this.selectedFile = null;
      this.imagePreview = null;
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  removeSelectedImage(): void {
    this.selectedFile = null;
    this.imagePreview = null;
  }

  saveProfile(): void {
    // Save updated profile data to localStorage
    if (this.profile) {
      // Update the profile picture if a new one was selected
      if (this.imagePreview) {
        this.profile.profilePicture = this.imagePreview as string;
      }
      
      // Update userData with profile changes
      const updatedUserData = {
        ...this.userData,
        fullName: this.profile.fullName,
        email: this.profile.email,
        phone: this.profile.phone,
        location: this.profile.location,
        bio: this.profile.bio,
        companyName: this.profile.companyName,
        industry: this.profile.industry,
        website: this.profile.website,
        profilePicture: this.profile.profilePicture
      };
      
      localStorage.setItem('userData', JSON.stringify(updatedUserData));
      sessionStorage.setItem('userData', JSON.stringify(updatedUserData));
      this.userData = updatedUserData;
    }
    
    this.isEditing = false;
    this.selectedFile = null;
    this.imagePreview = null;
    alert('Profile updated successfully!');
  }

  changePassword(): void {
    alert('Password change functionality would open a modal here.');
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    this.router.navigate(['/login']);
  }
}

