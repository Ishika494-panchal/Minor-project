export interface User {
  id: string;
  fullName: string;
  email: string;
  role: 'freelancer' | 'client' | 'admin';
  profilePicture?: string;
  phone?: string;
  location?: string;
}

