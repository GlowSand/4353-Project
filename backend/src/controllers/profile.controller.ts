import { Request, Response } from 'express';
import { UserProfile, CreateProfileRequest, UpdateProfileRequest } from '../types/profile.types';

const profiles: Map<string, UserProfile> = new Map();


const VALIDATION_RULES = {
  fullName: {
    minLength: 1,
    maxLength: 50
  },
  address1: {
    minLength: 1,
    maxLength: 100
  },
  address2: {
    maxLength: 100
  },
  city: {
    minLength: 1,
    maxLength: 100
  },
  state: {
    length: 2  
  },
  zipCode: {
    minLength: 5,
    maxLength: 10  
  },
  preferences: {
    maxLength: 500
  },
  skills: {
    minItems: 1,
    maxItems: 20,
    itemMaxLength: 50
  },
  availability: {
    minItems: 1,
    maxItems: 7  
  }
};

export const validateStringLength = (
  value: string,
  fieldName: string,
  minLength?: number,
  maxLength?: number
): { isValid: boolean; error?: string } => {
  if (minLength !== undefined && value.length < minLength) {
    return {
      isValid: false,
      error: `${fieldName} must be at least ${minLength} character(s) long`
    };
  }
  if (maxLength !== undefined && value.length > maxLength) {
    return {
      isValid: false,
      error: `${fieldName} must not exceed ${maxLength} characters`
    };
  }
  return { isValid: true };
};

export const validateStateCode = (state: string): { isValid: boolean; error?: string } => {
  const stateRegex = /^[A-Z]{2}$/;
  if (!stateRegex.test(state)) {
    return {
      isValid: false,
      error: 'State must be a valid 2-letter uppercase code (e.g., TX, CA, NY)'
    };
  }
  return { isValid: true };
};

export const validateZipCode = (zipCode: string): { isValid: boolean; error?: string } => {
  const zipRegex = /^\d{5}(-\d{4})?$/;
  if (!zipRegex.test(zipCode)) {
    return {
      isValid: false,
      error: 'Zip code must be in format 12345 or 12345-6789'
    };
  }
  return { isValid: true };
};

export const validateArray = (
  array: unknown,
  fieldName: string,
  minItems?: number,
  maxItems?: number,
  itemMaxLength?: number
): { isValid: boolean; error?: string } => {
  if (!Array.isArray(array)) {
    return {
      isValid: false,
      error: `${fieldName} must be an array`
    };
  }

  if (minItems !== undefined && array.length < minItems) {
    return {
      isValid: false,
      error: `${fieldName} must contain at least ${minItems} item(s)`
    };
  }

  if (maxItems !== undefined && array.length > maxItems) {
    return {
      isValid: false,
      error: `${fieldName} must not exceed ${maxItems} items`
    };
  }

  
  for (let i = 0; i < array.length; i++) {
    if (typeof array[i] !== 'string') {
      return {
        isValid: false,
        error: `${fieldName}[${i}] must be a string`
      };
    }

    const item = array[i] as string;
    if (item.trim().length === 0) {
      return {
        isValid: false,
        error: `${fieldName}[${i}] cannot be empty`
      };
    }

    if (itemMaxLength !== undefined && item.length > itemMaxLength) {
      return {
        isValid: false,
        error: `${fieldName}[${i}] must not exceed ${itemMaxLength} characters`
      };
    }
  }

  return { isValid: true };
};


export const validateProfileData = (
  profileData: CreateProfileRequest
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  
  if (!profileData.fullName || typeof profileData.fullName !== 'string') {
    errors.push('fullName is required and must be a string');
  } else {
    const nameValidation = validateStringLength(
      profileData.fullName.trim(),
      'fullName',
      VALIDATION_RULES.fullName.minLength,
      VALIDATION_RULES.fullName.maxLength
    );
    if (!nameValidation.isValid) {
      errors.push(nameValidation.error!);
    }
  }

  
  if (!profileData.location || typeof profileData.location !== 'object') {
    errors.push('location is required and must be an object');
  } else {
    const { address1, address2, city, state, zipCode } = profileData.location;

    
    if (!address1 || typeof address1 !== 'string') {
      errors.push('location.address1 is required and must be a string');
    } else {
      const addr1Validation = validateStringLength(
        address1.trim(),
        'address1',
        VALIDATION_RULES.address1.minLength,
        VALIDATION_RULES.address1.maxLength
      );
      if (!addr1Validation.isValid) {
        errors.push(addr1Validation.error!);
      }
    }

    
    if (address2 !== undefined && address2 !== null && address2 !== '') {
      if (typeof address2 !== 'string') {
        errors.push('location.address2 must be a string');
      } else {
        const addr2Validation = validateStringLength(
          address2,
          'address2',
          undefined,
          VALIDATION_RULES.address2.maxLength
        );
        if (!addr2Validation.isValid) {
          errors.push(addr2Validation.error!);
        }
      }
    }

    
    if (!city || typeof city !== 'string') {
      errors.push('location.city is required and must be a string');
    } else {
      const cityValidation = validateStringLength(
        city.trim(),
        'city',
        VALIDATION_RULES.city.minLength,
        VALIDATION_RULES.city.maxLength
      );
      if (!cityValidation.isValid) {
        errors.push(cityValidation.error!);
      }
    }

    
    if (!state || typeof state !== 'string') {
      errors.push('location.state is required and must be a string');
    } else {
      const normalizedState = state.trim().toUpperCase();
      const stateValidation = validateStateCode(normalizedState);
      if (!stateValidation.isValid) {
        errors.push(stateValidation.error!);
      }
    }

    
    if (!zipCode || typeof zipCode !== 'string') {
      errors.push('location.zipCode is required and must be a string');
    } else {
      const normalizedZip = zipCode.trim();
      const zipValidation = validateZipCode(normalizedZip);
      if (!zipValidation.isValid) {
        errors.push(zipValidation.error!);
      }
    }
  }

  
  const skillsValidation = validateArray(
    profileData.skills,
    'skills',
    VALIDATION_RULES.skills.minItems,
    VALIDATION_RULES.skills.maxItems,
    VALIDATION_RULES.skills.itemMaxLength
  );
  if (!skillsValidation.isValid) {
    errors.push(skillsValidation.error!);
  }

  
  if (profileData.preferences !== undefined && profileData.preferences !== null && profileData.preferences !== '') {
    if (typeof profileData.preferences !== 'string') {
      errors.push('preferences must be a string');
    } else {
      const prefValidation = validateStringLength(
        profileData.preferences,
        'preferences',
        undefined,
        VALIDATION_RULES.preferences.maxLength
      );
      if (!prefValidation.isValid) {
        errors.push(prefValidation.error!);
      }
    }
  }

  
  const availabilityValidation = validateArray(
    profileData.availability,
    'availability',
    VALIDATION_RULES.availability.minItems,
    VALIDATION_RULES.availability.maxItems
  );
  if (!availabilityValidation.isValid) {
    errors.push(availabilityValidation.error!);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};


export const getAllProfiles = (_req: Request, res: Response): void => {
  const allProfiles = Array.from(profiles.values());
  res.status(200).json({
    success: true,
    count: allProfiles.length,
    data: allProfiles
  });
};


export const getProfileById = (req: Request, res: Response): void => {
  const { userId } = req.params;

  
  if (!userId || userId.trim().length === 0) {
    res.status(400).json({
      success: false,
      message: 'userId is required',
      errors: ['userId parameter cannot be empty']
    });
    return;
  }

  const profile = profiles.get(userId);

  if (!profile) {
    res.status(404).json({
      success: false,
      message: `Profile not found for user ID: ${userId}`
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: profile
  });
};



export const createProfile = (req: Request, res: Response): void => {
  const { userId } = req.params;
  const profileData: CreateProfileRequest = req.body;

  
  if (!userId || userId.trim().length === 0) {
    res.status(400).json({
      success: false,
      message: 'userId is required',
      errors: ['userId parameter cannot be empty']
    });
    return;
  }

  
  if (profiles.has(userId)) {
    res.status(409).json({
      success: false,
      message: `Profile already exists for user ID: ${userId}`
    });
    return;
  }

  
  const validation = validateProfileData(profileData);
  if (!validation.isValid) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validation.errors
    });
    return;
  }

  
  const newProfile: UserProfile = {
    userId,
    fullName: profileData.fullName.trim(),
    location: {
      address1: profileData.location.address1.trim(),
      address2: profileData.location.address2?.trim(),
      city: profileData.location.city.trim(),
      state: profileData.location.state.toUpperCase(),
      zipCode: profileData.location.zipCode.trim()
    },
    skills: profileData.skills.map(skill => skill.trim()),
    preferences: profileData.preferences?.trim(),
    availability: profileData.availability.map(day => day.trim())
  };

  profiles.set(userId, newProfile);

  res.status(201).json({
    success: true,
    message: 'Profile created successfully',
    data: newProfile
  });
};



export const updateProfile = (req: Request, res: Response): void => {
  const { userId } = req.params;
  const updateData: UpdateProfileRequest = req.body;

  
  if (!userId || userId.trim().length === 0) {
    res.status(400).json({
      success: false,
      message: 'userId is required',
      errors: ['userId parameter cannot be empty']
    });
    return;
  }

  const existingProfile = profiles.get(userId);

  if (!existingProfile) {
    res.status(404).json({
      success: false,
      message: `Profile not found for user ID: ${userId}`
    });
    return;
  }

  const errors: string[] = [];

  
  if (updateData.fullName !== undefined) {
    if (typeof updateData.fullName !== 'string' || updateData.fullName.trim().length === 0) {
      errors.push('fullName must be a non-empty string');
    } else {
      const nameValidation = validateStringLength(
        updateData.fullName.trim(),
        'fullName',
        VALIDATION_RULES.fullName.minLength,
        VALIDATION_RULES.fullName.maxLength
      );
      if (!nameValidation.isValid) {
        errors.push(nameValidation.error!);
      }
    }
  }

  // Validate location if provided
  if (updateData.location) {
    const { address1, address2, city, state, zipCode } = updateData.location;

    if (!address1 || typeof address1 !== 'string' || address1.trim().length === 0) {
      errors.push('location.address1 is required and must be a non-empty string');
    } else {
      const addr1Validation = validateStringLength(
        address1.trim(),
        'address1',
        VALIDATION_RULES.address1.minLength,
        VALIDATION_RULES.address1.maxLength
      );
      if (!addr1Validation.isValid) {
        errors.push(addr1Validation.error!);
      }
    }

    if (address2 !== undefined && address2 !== null && address2 !== '') {
      if (typeof address2 !== 'string') {
        errors.push('location.address2 must be a string');
      } else {
        const addr2Validation = validateStringLength(
          address2,
          'address2',
          undefined,
          VALIDATION_RULES.address2.maxLength
        );
        if (!addr2Validation.isValid) {
          errors.push(addr2Validation.error!);
        }
      }
    }

    if (!city || typeof city !== 'string' || city.trim().length === 0) {
      errors.push('location.city is required and must be a non-empty string');
    } else {
      const cityValidation = validateStringLength(
        city.trim(),
        'city',
        VALIDATION_RULES.city.minLength,
        VALIDATION_RULES.city.maxLength
      );
      if (!cityValidation.isValid) {
        errors.push(cityValidation.error!);
      }
    }

    if (!state || typeof state !== 'string') {
      errors.push('location.state is required and must be a string');
    } else {
      const normalizedState = state.trim().toUpperCase();
      const stateValidation = validateStateCode(normalizedState);
      if (!stateValidation.isValid) {
        errors.push(stateValidation.error!);
      }
    }

    if (!zipCode || typeof zipCode !== 'string') {
      errors.push('location.zipCode is required and must be a string');
    } else {
      const normalizedZip = zipCode.trim();
      const zipValidation = validateZipCode(normalizedZip);
      if (!zipValidation.isValid) {
        errors.push(zipValidation.error!);
      }
    }
  }

  // Validate skills if provided
  if (updateData.skills !== undefined) {
    const skillsValidation = validateArray(
      updateData.skills,
      'skills',
      VALIDATION_RULES.skills.minItems,
      VALIDATION_RULES.skills.maxItems,
      VALIDATION_RULES.skills.itemMaxLength
    );
    if (!skillsValidation.isValid) {
      errors.push(skillsValidation.error!);
    }
  }

  // Validate preferences if provided
  if (updateData.preferences !== undefined && updateData.preferences !== null && updateData.preferences !== '') {
    if (typeof updateData.preferences !== 'string') {
      errors.push('preferences must be a string');
    } else {
      const prefValidation = validateStringLength(
        updateData.preferences,
        'preferences',
        undefined,
        VALIDATION_RULES.preferences.maxLength
      );
      if (!prefValidation.isValid) {
        errors.push(prefValidation.error!);
      }
    }
  }

  // Validate availability if provided
  if (updateData.availability !== undefined) {
    const availabilityValidation = validateArray(
      updateData.availability,
      'availability',
      VALIDATION_RULES.availability.minItems,
      VALIDATION_RULES.availability.maxItems
    );
    if (!availabilityValidation.isValid) {
      errors.push(availabilityValidation.error!);
    }
  }

  // Return errors if validation failed
  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
    return;
  }

  // Update profile with trimmed and normalized data
  const updatedProfile: UserProfile = {
    ...existingProfile,
    ...(updateData.fullName && { fullName: updateData.fullName.trim() }),
    ...(updateData.location && {
      location: {
        address1: updateData.location.address1.trim(),
        address2: updateData.location.address2?.trim(),
        city: updateData.location.city.trim(),
        state: updateData.location.state.toUpperCase(),
        zipCode: updateData.location.zipCode.trim()
      }
    }),
    ...(updateData.skills && { skills: updateData.skills.map(skill => skill.trim()) }),
    ...(updateData.preferences !== undefined && { preferences: updateData.preferences?.trim() }),
    ...(updateData.availability && { availability: updateData.availability.map(day => day.trim()) })
  };

  profiles.set(userId, updatedProfile);

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: updatedProfile
  });
};



export const deleteProfile = (req: Request, res: Response): void => {
  const { userId } = req.params;

  
  if (!userId || userId.trim().length === 0) {
    res.status(400).json({
      success: false,
      message: 'userId is required',
      errors: ['userId parameter cannot be empty']
    });
    return;
  }

  const profile = profiles.get(userId);

  if (!profile) {
    res.status(404).json({
      success: false,
      message: `Profile not found for user ID: ${userId}`
    });
    return;
  }

  profiles.delete(userId);

  res.status(200).json({
    success: true,
    message: 'Profile deleted successfully'
  });
};


export const clearAllProfiles = (): void => {
  profiles.clear();
};
