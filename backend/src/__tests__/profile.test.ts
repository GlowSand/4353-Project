import request from 'supertest';
import app from '../index';
import {
  clearAllProfiles,
  validateStringLength,
  validateStateCode,
  validateZipCode,
  validateArray,
  validateProfileData
} from '../controllers/profile.controller';

describe('Profile API', () => {
 
  beforeEach(() => {
    clearAllProfiles();
  });

  describe('Validation Functions', () => {
    describe('validateStringLength', () => {
      it('should validate minimum length', () => {
        const result = validateStringLength('ab', 'testField', 3, 10);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('must be at least 3 character(s)');
      });

      it('should validate maximum length', () => {
        const result = validateStringLength('abcdefghijk', 'testField', 1, 10);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('must not exceed 10 characters');
      });

      it('should pass valid string', () => {
        const result = validateStringLength('valid', 'testField', 1, 10);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should handle string at exact minimum length', () => {
        const result = validateStringLength('abc', 'testField', 3, 10);
        expect(result.isValid).toBe(true);
      });

      it('should handle string at exact maximum length', () => {
        const result = validateStringLength('abcdefghij', 'testField', 1, 10);
        expect(result.isValid).toBe(true);
      });
    });

    describe('validateStateCode', () => {
      it('should reject lowercase state codes', () => {
        const result = validateStateCode('tx');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('2-letter uppercase code');
      });

      it('should reject state codes with wrong length', () => {
        const result = validateStateCode('TEX');
        expect(result.isValid).toBe(false);
      });

      it('should accept valid state codes', () => {
        const result = validateStateCode('TX');
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should reject non-letter characters', () => {
        const result = validateStateCode('T1');
        expect(result.isValid).toBe(false);
      });

      it('should reject empty string', () => {
        const result = validateStateCode('');
        expect(result.isValid).toBe(false);
      });

      it('should reject single letter', () => {
        const result = validateStateCode('T');
        expect(result.isValid).toBe(false);
      });
    });

    describe('validateZipCode', () => {
      it('should accept 5-digit zip code', () => {
        const result = validateZipCode('12345');
        expect(result.isValid).toBe(true);
      });

      it('should accept ZIP+4 format', () => {
        const result = validateZipCode('12345-6789');
        expect(result.isValid).toBe(true);
      });

      it('should reject invalid formats', () => {
        const result = validateZipCode('1234');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('12345 or 12345-6789');
      });

      it('should reject letters in zip code', () => {
        const result = validateZipCode('ABCDE');
        expect(result.isValid).toBe(false);
      });

      it('should reject 6-digit zip code', () => {
        const result = validateZipCode('123456');
        expect(result.isValid).toBe(false);
      });

      it('should reject incomplete ZIP+4', () => {
        const result = validateZipCode('12345-678');
        expect(result.isValid).toBe(false);
      });
    });

    describe('validateArray', () => {
      it('should reject non-arrays', () => {
        const result = validateArray('not an array', 'testArray');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('must be an array');
      });

      it('should validate minimum items', () => {
        const result = validateArray([], 'testArray', 1);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('at least 1 item');
      });

      it('should validate maximum items', () => {
        const result = validateArray([1, 2, 3, 4], 'testArray', 1, 3);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('must not exceed 3 items');
      });

      it('should reject non-string items', () => {
        const result = validateArray([1, 'two'], 'testArray');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('must be a string');
      });

      it('should reject empty string items', () => {
        const result = validateArray(['valid', '  '], 'testArray');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('cannot be empty');
      });

      it('should validate item length', () => {
        const result = validateArray(['short', 'this is too long'], 'testArray', 1, 10, 10);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('must not exceed 10 characters');
      });

      it('should pass valid array', () => {
        const result = validateArray(['item1', 'item2'], 'testArray', 1, 5, 10);
        expect(result.isValid).toBe(true);
      });

      it('should handle array at exact max items', () => {
        const result = validateArray(['a', 'b', 'c'], 'testArray', 1, 3);
        expect(result.isValid).toBe(true);
      });
    });

    describe('validateProfileData', () => {
      it('should validate complete valid profile', () => {
        const profileData = {
          fullName: 'John Doe',
          location: {
            address1: '123 Main St',
            city: 'Houston',
            state: 'TX',
            zipCode: '12345'
          },
          skills: ['JavaScript'],
          availability: ['Monday']
        };

        const result = validateProfileData(profileData);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should catch multiple validation errors', () => {
        const profileData = {
          fullName: '',
          location: {
            address1: '',
            city: '',
            state: 'texas',
            zipCode: '123'
          },
          skills: [],
          availability: []
        };

        const result = validateProfileData(profileData);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should reject fullName at length limit +1', () => {
        const profileData = {
          fullName: 'a'.repeat(51),
          location: {
            address1: '123 Main St',
            city: 'Houston',
            state: 'TX',
            zipCode: '12345'
          },
          skills: ['JavaScript'],
          availability: ['Monday']
        };

        const result = validateProfileData(profileData);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('fullName'))).toBe(true);
      });

      it('should accept fullName at maximum length', () => {
        const profileData = {
          fullName: 'a'.repeat(50),
          location: {
            address1: '123 Main St',
            city: 'Houston',
            state: 'TX',
            zipCode: '12345'
          },
          skills: ['JavaScript'],
          availability: ['Monday']
        };

        const result = validateProfileData(profileData);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('POST /api/profile/:userId', () => {
    it('should create a new profile successfully', async () => {
      const profileData = {
        fullName: 'John Doe',
        location: {
          address1: '123 Main St',
          address2: 'Apt 4B',
          city: 'Houston',
          state: 'TX',
          zipCode: '77001'
        },
        skills: ['JavaScript', 'TypeScript', 'React'],
        preferences: 'Remote work preferred',
        availability: ['Monday', 'Wednesday', 'Friday']
      };

      const response = await request(app)
        .post('/api/profile/user123')
        .send(profileData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        userId: 'user123',
        fullName: 'John Doe'
      });
    });

    it('should trim and normalize all string fields', async () => {
      const profileData = {
        fullName: '  John Doe  ',
        location: {
          address1: '  123 Main St  ',
          city: '  Houston  ',
          state: 'TX',  // Use uppercase to avoid validation failure
          zipCode: '  77001  '
        },
        skills: ['  JavaScript  ', '  React  '],
        preferences: '  Remote work  ',
        availability: ['  Monday  ']
      };

      const response = await request(app)
        .post('/api/profile/user123')
        .send(profileData);

      expect(response.status).toBe(201);
      expect(response.body.data.fullName).toBe('John Doe');
      expect(response.body.data.location.address1).toBe('123 Main St');
      expect(response.body.data.location.state).toBe('TX');
      expect(response.body.data.skills[0]).toBe('JavaScript');
      expect(response.body.data.preferences).toBe('Remote work');
      expect(response.body.data.availability[0]).toBe('Monday');
    });

    it('should return 400 for fullName too long', async () => {
      const profileData = {
        fullName: 'a'.repeat(51),
        location: {
          address1: '123 Main St',
          city: 'Houston',
          state: 'TX',
          zipCode: '12345'
        },
        skills: ['JavaScript'],
        availability: ['Monday']
      };

      const response = await request(app)
        .post('/api/profile/user123')
        .send(profileData);

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    it('should accept fullName at maximum length (50 chars)', async () => {
      const profileData = {
        fullName: 'a'.repeat(50),
        location: {
          address1: '123 Main St',
          city: 'Houston',
          state: 'TX',
          zipCode: '12345'
        },
        skills: ['JavaScript'],
        availability: ['Monday']
      };

      const response = await request(app)
        .post('/api/profile/user123')
        .send(profileData);

      expect(response.status).toBe(201);
    });

    it('should return 400 for address1 too long', async () => {
      const profileData = {
        fullName: 'John Doe',
        location: {
          address1: 'a'.repeat(101),
          city: 'Houston',
          state: 'TX',
          zipCode: '12345'
        },
        skills: ['JavaScript'],
        availability: ['Monday']
      };

      const response = await request(app)
        .post('/api/profile/user123')
        .send(profileData);

      expect(response.status).toBe(400);
    });

    it('should accept address1 at maximum length (100 chars)', async () => {
      const profileData = {
        fullName: 'John Doe',
        location: {
          address1: 'a'.repeat(100),
          city: 'Houston',
          state: 'TX',
          zipCode: '12345'
        },
        skills: ['JavaScript'],
        availability: ['Monday']
      };

      const response = await request(app)
        .post('/api/profile/user123')
        .send(profileData);

      expect(response.status).toBe(201);
    });

    it('should accept and normalize lowercase state codes', async () => {
      const profileData = {
        fullName: 'John Doe',
        location: {
          address1: '123 Main St',
          city: 'Houston',
          state: 'tx',  // lowercase will be normalized
          zipCode: '12345'
        },
        skills: ['JavaScript'],
        availability: ['Monday']
      };

      const response = await request(app)
        .post('/api/profile/user123')
        .send(profileData);

      expect(response.status).toBe(201);
      expect(response.body.data.location.state).toBe('TX');  // normalized to uppercase
    });

    it('should return 400 for invalid state code (non-letters)', async () => {
      const profileData = {
        fullName: 'John Doe',
        location: {
          address1: '123 Main St',
          city: 'Houston',
          state: 'T1',  // contains number
          zipCode: '12345'
        },
        skills: ['JavaScript'],
        availability: ['Monday']
      };

      const response = await request(app)
        .post('/api/profile/user123')
        .send(profileData);

      expect(response.status).toBe(400);
      expect(response.body.errors.some((e: string) => e.includes('State'))).toBe(true);
    });

    it('should return 400 for invalid state code (3 letters)', async () => {
      const profileData = {
        fullName: 'John Doe',
        location: {
          address1: '123 Main St',
          city: 'Houston',
          state: 'TEX',
          zipCode: '12345'
        },
        skills: ['JavaScript'],
        availability: ['Monday']
      };

      const response = await request(app)
        .post('/api/profile/user123')
        .send(profileData);

      expect(response.status).toBe(400);
      expect(response.body.errors.some((e: string) => e.includes('State'))).toBe(true);
    });

    it('should return 400 for invalid zip code format', async () => {
      const profileData = {
        fullName: 'John Doe',
        location: {
          address1: '123 Main St',
          city: 'Houston',
          state: 'TX',
          zipCode: '123'
        },
        skills: ['JavaScript'],
        availability: ['Monday']
      };

      const response = await request(app)
        .post('/api/profile/user123')
        .send(profileData);

      expect(response.status).toBe(400);
      expect(response.body.errors.some((e: string) => e.includes('Zip'))).toBe(true);
    });

    it('should accept ZIP+4 format', async () => {
      const profileData = {
        fullName: 'John Doe',
        location: {
          address1: '123 Main St',
          city: 'Houston',
          state: 'TX',
          zipCode: '77001-1234'
        },
        skills: ['JavaScript'],
        availability: ['Monday']
      };

      const response = await request(app)
        .post('/api/profile/user123')
        .send(profileData);

      expect(response.status).toBe(201);
    });

    it('should return 400 for too many skills (21 items)', async () => {
      const profileData = {
        fullName: 'John Doe',
        location: {
          address1: '123 Main St',
          city: 'Houston',
          state: 'TX',
          zipCode: '12345'
        },
        skills: Array(21).fill('JavaScript'),
        availability: ['Monday']
      };

      const response = await request(app)
        .post('/api/profile/user123')
        .send(profileData);

      expect(response.status).toBe(400);
      expect(response.body.errors.some((e: string) => e.includes('skills'))).toBe(true);
    });

    it('should accept maximum number of skills (20 items)', async () => {
      const profileData = {
        fullName: 'John Doe',
        location: {
          address1: '123 Main St',
          city: 'Houston',
          state: 'TX',
          zipCode: '12345'
        },
        skills: Array(20).fill('JavaScript'),
        availability: ['Monday']
      };

      const response = await request(app)
        .post('/api/profile/user123')
        .send(profileData);

      expect(response.status).toBe(201);
    });

    it('should return 400 for skill name too long (51 chars)', async () => {
      const profileData = {
        fullName: 'John Doe',
        location: {
          address1: '123 Main St',
          city: 'Houston',
          state: 'TX',
          zipCode: '12345'
        },
        skills: ['a'.repeat(51)],
        availability: ['Monday']
      };

      const response = await request(app)
        .post('/api/profile/user123')
        .send(profileData);

      expect(response.status).toBe(400);
    });

    it('should accept skill name at maximum length (50 chars)', async () => {
      const profileData = {
        fullName: 'John Doe',
        location: {
          address1: '123 Main St',
          city: 'Houston',
          state: 'TX',
          zipCode: '12345'
        },
        skills: ['a'.repeat(50)],
        availability: ['Monday']
      };

      const response = await request(app)
        .post('/api/profile/user123')
        .send(profileData);

      expect(response.status).toBe(201);
    });

    it('should return 400 for preferences too long (501 chars)', async () => {
      const profileData = {
        fullName: 'John Doe',
        location: {
          address1: '123 Main St',
          city: 'Houston',
          state: 'TX',
          zipCode: '12345'
        },
        skills: ['JavaScript'],
        preferences: 'a'.repeat(501),
        availability: ['Monday']
      };

      const response = await request(app)
        .post('/api/profile/user123')
        .send(profileData);

      expect(response.status).toBe(400);
      expect(response.body.errors.some((e: string) => e.includes('preferences'))).toBe(true);
    });

    it('should accept preferences at maximum length (500 chars)', async () => {
      const profileData = {
        fullName: 'John Doe',
        location: {
          address1: '123 Main St',
          city: 'Houston',
          state: 'TX',
          zipCode: '12345'
        },
        skills: ['JavaScript'],
        preferences: 'a'.repeat(500),
        availability: ['Monday']
      };

      const response = await request(app)
        .post('/api/profile/user123')
        .send(profileData);

      expect(response.status).toBe(201);
    });

    it('should return 400 for non-string in skills array', async () => {
      const profileData = {
        fullName: 'John Doe',
        location: {
          address1: '123 Main St',
          city: 'Houston',
          state: 'TX',
          zipCode: '12345'
        },
        skills: [123 as any],
        availability: ['Monday']
      };

      const response = await request(app)
        .post('/api/profile/user123')
        .send(profileData);

      expect(response.status).toBe(400);
    });

    it('should return 400 if required fields are missing', async () => {
      const incompleteData = {
        fullName: 'John Doe'
      };

      const response = await request(app)
        .post('/api/profile/user123')
        .send(incompleteData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('should return 400 if location is incomplete', async () => {
      const profileData = {
        fullName: 'John Doe',
        location: {
          address1: '123 Main St',
          city: 'Houston'
        },
        skills: ['JavaScript'],
        availability: ['Monday']
      };

      const response = await request(app)
        .post('/api/profile/user123')
        .send(profileData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should return 400 if skills is not an array or empty', async () => {
      const profileData = {
        fullName: 'John Doe',
        location: {
          address1: '123 Main St',
          city: 'Houston',
          state: 'TX',
          zipCode: '77001'
        },
        skills: [],
        availability: ['Monday']
      };

      const response = await request(app)
        .post('/api/profile/user123')
        .send(profileData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors.some((e: string) => e.includes('skills'))).toBe(true);
    });

    it('should return 400 if availability is not an array or empty', async () => {
      const profileData = {
        fullName: 'John Doe',
        location: {
          address1: '123 Main St',
          city: 'Houston',
          state: 'TX',
          zipCode: '77001'
        },
        skills: ['JavaScript'],
        availability: []
      };

      const response = await request(app)
        .post('/api/profile/user123')
        .send(profileData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors.some((e: string) => e.includes('availability'))).toBe(true);
    });

    it('should return 409 if profile already exists', async () => {
      const profileData = {
        fullName: 'John Doe',
        location: {
          address1: '123 Main St',
          city: 'Houston',
          state: 'TX',
          zipCode: '77001'
        },
        skills: ['JavaScript'],
        availability: ['Monday']
      };

      
      await request(app)
        .post('/api/profile/user123')
        .send(profileData);

     
      const response = await request(app)
        .post('/api/profile/user123')
        .send(profileData);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('GET /api/profile/:userId', () => {
    it('should get profile by user ID', async () => {
      const profileData = {
        fullName: 'John Doe',
        location: {
          address1: '123 Main St',
          city: 'Houston',
          state: 'TX',
          zipCode: '77001'
        },
        skills: ['JavaScript', 'TypeScript'],
        availability: ['Monday', 'Wednesday']
      };

      await request(app)
        .post('/api/profile/user123')
        .send(profileData);

      const response = await request(app).get('/api/profile/user123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBe('user123');
      expect(response.body.data.fullName).toBe('John Doe');
    });

    it('should return 404 if profile not found', async () => {
      const response = await request(app).get('/api/profile/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('GET /api/profile', () => {
    it('should get all profiles', async () => {
      const profile1 = {
        fullName: 'John Doe',
        location: {
          address1: '123 Main St',
          city: 'Houston',
          state: 'TX',
          zipCode: '77001'
        },
        skills: ['JavaScript'],
        availability: ['Monday']
      };

      const profile2 = {
        fullName: 'Jane Smith',
        location: {
          address1: '456 Oak Ave',
          city: 'Austin',
          state: 'TX',
          zipCode: '78701'
        },
        skills: ['Python'],
        availability: ['Tuesday']
      };

     
      await request(app).post('/api/profile/user1').send(profile1);
      await request(app).post('/api/profile/user2').send(profile2);

      
      const response = await request(app).get('/api/profile');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2);
      expect(response.body.data).toHaveLength(2);
    });

    it('should return empty array if no profiles exist', async () => {
      const response = await request(app).get('/api/profile');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(0);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('PUT /api/profile/:userId', () => {
    beforeEach(async () => {
      const originalProfile = {
        fullName: 'John Doe',
        location: {
          address1: '123 Main St',
          city: 'Houston',
          state: 'TX',
          zipCode: '77001'
        },
        skills: ['JavaScript'],
        availability: ['Monday']
      };

      await request(app)
        .post('/api/profile/user123')
        .send(originalProfile);
    });

    it('should update an existing profile', async () => {
      const updateData = {
        fullName: 'John Smith',
        skills: ['JavaScript', 'TypeScript', 'React']
      };

      const response = await request(app)
        .put('/api/profile/user123')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.fullName).toBe('John Smith');
      expect(response.body.data.skills).toHaveLength(3);
      expect(response.body.data.location.city).toBe('Houston');
    });

    it('should trim whitespace in updated fields', async () => {
      const updateData = {
        fullName: '  Jane Doe  ',
        skills: ['  Python  ', '  Java  ']
      };

      const response = await request(app)
        .put('/api/profile/user123')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data.fullName).toBe('Jane Doe');
      expect(response.body.data.skills[0]).toBe('Python');
    });

    it('should normalize state code to uppercase in location update', async () => {
      const updateData = {
        location: {
          address1: '456 New St',
          city: 'Dallas',
          state: 'ca',
          zipCode: '90001'
        }
      };

      const response = await request(app)
        .put('/api/profile/user123')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data.location.state).toBe('CA');
    });

    it('should return 404 if profile does not exist', async () => {
      const updateData = {
        fullName: 'John Smith'
      };

      const response = await request(app)
        .put('/api/profile/nonexistent')
        .send(updateData);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should return 400 for invalid state in location update', async () => {
      const updateData = {
        location: {
          address1: '456 New St',
          city: 'Dallas',
          state: 'texas',
          zipCode: '75001'
        }
      };

      const response = await request(app)
        .put('/api/profile/user123')
        .send(updateData);

      expect(response.status).toBe(400);
      expect(response.body.errors.some((e: string) => e.includes('State'))).toBe(true);
    });

    it('should return 400 for invalid zip code in update', async () => {
      const updateData = {
        location: {
          address1: '456 New St',
          city: 'Dallas',
          state: 'TX',
          zipCode: 'ABCDE'
        }
      };

      const response = await request(app)
        .put('/api/profile/user123')
        .send(updateData);

      expect(response.status).toBe(400);
      expect(response.body.errors.some((e: string) => e.includes('Zip'))).toBe(true);
    });

    it('should return 400 for empty skills array', async () => {
      const updateData = { skills: [] };
      const response = await request(app)
        .put('/api/profile/user123')
        .send(updateData);

      expect(response.status).toBe(400);
      expect(response.body.errors.some((e: string) => e.includes('skills'))).toBe(true);
    });

    it('should return 400 for fullName too long in update', async () => {
      const updateData = { fullName: 'a'.repeat(51) };
      const response = await request(app)
        .put('/api/profile/user123')
        .send(updateData);

      expect(response.status).toBe(400);
    });

    it('should return 400 for preferences too long in update', async () => {
      const updateData = { preferences: 'a'.repeat(501) };
      const response = await request(app)
        .put('/api/profile/user123')
        .send(updateData);

      expect(response.status).toBe(400);
    });

    it('should return 400 for too many skills in update', async () => {
      const updateData = { skills: Array(21).fill('JavaScript') };
      const response = await request(app)
        .put('/api/profile/user123')
        .send(updateData);

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/profile/:userId', () => {
    it('should delete an existing profile', async () => {
      const profileData = {
        fullName: 'John Doe',
        location: {
          address1: '123 Main St',
          city: 'Houston',
          state: 'TX',
          zipCode: '77001'
        },
        skills: ['JavaScript'],
        availability: ['Monday']
      };

      await request(app)
        .post('/api/profile/user123')
        .send(profileData);

      const response = await request(app).delete('/api/profile/user123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');

      const getResponse = await request(app).get('/api/profile/user123');
      expect(getResponse.status).toBe(404);
    });

    it('should return 404 if profile does not exist', async () => {
      const response = await request(app).delete('/api/profile/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });
});
 