export interface Location {
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface UserProfile {
  userId: string;
  fullName: string;
  location: Location;
  skills: string[];
  preferences?: string;
  availability: string[];
}

export interface CreateProfileRequest {
  fullName: string;
  location: Location;
  skills: string[];
  preferences?: string;
  availability: string[];
}

export interface UpdateProfileRequest {
  fullName?: string;
  location?: Location;
  skills?: string[];
  preferences?: string;
  availability?: string[];
}
