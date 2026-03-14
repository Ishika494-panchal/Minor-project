import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

export interface FreelancerProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  profilePicture: string;
  title: string;
  skills: string[];
  aboutMe: string;
  portfolioLink: string;
  memberSince: string;
  completedProjects: number;
  activeProjects: number;
  totalEarnings: number;
}

@Component({
  selector: 'app-freelancer-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './freelancer-profile.component.html',
  styleUrls: ['./freelancer-profile.component.css']
})
export class FreelancerProfileComponent implements OnInit {
  userData: any = null;
  profile: FreelancerProfile | null = null;
  isEditing: boolean = false;
  selectedFile: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;
  skillsString: string = '';

  constructor(
    private router: Router
  ) {}

  ngOnInit(): void {
    const userDataStr = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    if (userDataStr) {
      this.userData = JSON.parse(userDataStr);
      this.loadProfile();
    } else {
      this.loadMockProfile();
    }
  }

  loadProfile(): void {
    if (this.userData) {
      this.profile = {
        id: this.userData.id || '',
        fullName: this.userData.fullName || 'John Doe',
        email: this.userData.email || 'john@example.com',
        phone: this.userData.phone || '+91 9876543210',
        location: this.userData.location || 'Mumbai, India',
        profilePicture: this.userData.profilePicture || 'assets/client.jpeg',
        title: this.userData.title || 'Full Stack Web Developer',
        skills: this.userData.skills || ['Angular', 'Node.js', 'UI Design', 'React', 'TypeScript'],
        aboutMe: this.userData.aboutMe || 'Experienced Full Stack Developer with 5+ years of expertise in building modern web applications. Passionate about creating user-friendly interfaces and scalable backend solutions.',
        portfolioLink: this.userData.portfolioLink || 'https://myportfolio.com',
        memberSince: this.userData.memberSince || 'January 2023',
        completedProjects: this.userData.completedProjects || 23,
        activeProjects: this.userData.activeProjects || 4,
        totalEarnings: this.userData.totalEarnings || 125000
      };
      this.skillsString = this.profile.skills.join(', ');
    } else {
      this.loadMockProfile();
    }
  }

  loadMockProfile(): void {
    this.profile = {
      id: '1',
      fullName: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+91 9876543210',
      location: 'Mumbai, India',
      profilePicture: 'assets/client.jpeg',
      title: 'Full Stack Web Developer',
      skills: ['Angular', 'Node.js', 'UI Design', 'React', 'TypeScript', 'MongoDB'],
      aboutMe: 'Experienced Full Stack Developer with 5+ years of expertise in building modern web applications. Passionate about creating user-friendly interfaces and scalable backend solutions. I have successfully delivered 20+ projects for clients across various industries.',
      portfolioLink: 'https://myportfolio.com',
      memberSince: 'January 2023',
      completedProjects: 23,
      activeProjects: 4,
      totalEarnings: 125000
    };
    this.skillsString = this.profile.skills.join(', ');
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    if (!this.isEditing) {
      this.selectedFile = null;
      this.imagePreview = null;
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      
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
    if (this.profile) {
      if (this.imagePreview) {
        this.profile.profilePicture = this.imagePreview as string;
      }
      
      const updatedUserData = {
        ...this.userData,
        fullName: this.profile.fullName,
        email: this.profile.email,
        phone: this.profile.phone,
        location: this.profile.location,
        title: this.profile.title,
        skills: this.profile.skills,
        aboutMe: this.profile.aboutMe,
        portfolioLink: this.profile.portfolioLink
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

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    this.router.navigate(['/login']);
  }

  goToDashboard(): void {
    this.router.navigate(['/freelancer-dashboard']);
  }
}

