// API service for profile operations

const API_BASE_URL = 'http://localhost:3000/api/profile';

export interface Location {
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface ProfileData {
  fullName: string;
  location: Location;
  skills: string[];
  preferences?: string;
  availability: string[];
}

export interface ProfileResponse {
  success: boolean;
  data?: any;
  message?: string;
  errors?: string[];
}


export async function getProfile(userId: string): Promise<ProfileResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/${userId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return {
      success: false,
      message: 'Failed to fetch profile',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}


export async function createProfile(userId: string, profileData: ProfileData): Promise<ProfileResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating profile:', error);
    return {
      success: false,
      message: 'Failed to create profile',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}


export async function updateProfile(userId: string, profileData: Partial<ProfileData>): Promise<ProfileResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating profile:', error);
    return {
      success: false,
      message: 'Failed to update profile',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}


export async function getAllProfiles(): Promise<ProfileResponse> {
  try {
    const response = await fetch(API_BASE_URL);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching profiles:', error);
    return {
      success: false,
      message: 'Failed to fetch profiles',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}
