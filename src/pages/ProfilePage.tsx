import { useState, useEffect } from 'react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { getProfile, createProfile, updateProfile } from '../services/profileApi';
import type { ProfileData } from '../services/profileApi';

export default function ProfilePage() {
  const userId = 'user123';
  
  const [name, setName] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [preference, setPreference] = useState('');
  const [availability, setAvailability] = useState<Date[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [profileExists, setProfileExists] = useState(false);

 
  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    setIsLoading(true);
    try {
      const response = await getProfile(userId);
      
      if (response.success && response.data) {
        
        setName(response.data.fullName);
        setAddress1(response.data.location.address1);
        setAddress2(response.data.location.address2 || '');
        setCity(response.data.location.city);
        setState(response.data.location.state);
        setZip(response.data.location.zipCode);
        setSkills(response.data.skills);
        setPreference(response.data.preferences || '');
        
        
        setAvailability(response.data.availability.map((day: string) => new Date(day)));
        
        setProfileExists(true);
      } else {
        setProfileExists(false);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    
    if (!name.trim()) {
      alert('Please enter your name.');
      return;
    }
    
    if (!address1.trim()) {
      alert('Please enter your address.');
      return;
    }
    
    if (!city.trim()) {
      alert('Please enter your city.');
      return;
    }
    
    if (!state) {
      alert('Please select your state.');
      return;
    }
    
    if (!zip.trim()) {
      alert('Please enter your zip code.');
      return;
    }
    
    if (zip.length < 5 || zip.length > 9) {
      alert('Zip code must be between 5 and 9 characters.');
      return;
    }

    if (skills.length === 0) {
      alert('Please select at least one skill.');
      return;
    }

    if (availability.length === 0) {
      alert('Please select at least one availability date.');
      return;
    }

    
    const profileData: ProfileData = {
      fullName: name,
      location: {
        address1: address1,
        address2: address2 || undefined,
        city: city,
        state: state,
        zipCode: zip
      },
      skills: skills,
      preferences: preference || undefined,
      availability: availability.map(date => date.toLocaleDateString('en-US', { weekday: 'long' }))
    };

    setIsLoading(true);
    try {
      let response;
      
      if (profileExists) {
        
        response = await updateProfile(userId, profileData);
      } else {
        
        response = await createProfile(userId, profileData);
      }

      if (response.success) {
        alert('Profile saved successfully!');
        setProfileExists(true);
      } else {
        const errorMessage = response.errors?.join('\n') || response.message || 'Failed to save profile';
        alert('Error saving profile:\n' + errorMessage);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('An unexpected error occurred while saving the profile.');
    } finally {
      setIsLoading(false);
    }
  };

return (
  <div className="min-h-screen py-8 px-4"> 
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow-lg rounded-lg p-8 mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">Profile Page</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name*
            </label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              maxLength={50}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-white"
              placeholder="Full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address 1*
            </label>
            <input 
              type="text" 
              value={address1} 
              onChange={(e) => setAddress1(e.target.value)} 
              maxLength={100}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-white"
              placeholder="Street address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address 2
            </label>
            <input 
              type="text" 
              value={address2} 
              onChange={(e) => setAddress2(e.target.value)} 
              maxLength={100}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-white"
              placeholder="(optional)"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City*
              </label>
              <input 
                type="text" 
                value={city} 
                onChange={(e) => setCity(e.target.value)} 
                maxLength={100}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-white"
                placeholder="City"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State*
              </label>
              <select 
                value={state} 
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-white"
              >
                <option value="">Select State</option>
                <option value="TX">Texas</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Zip Code*
              </label>
              <input 
                type="text" 
                value={zip} 
                onChange={(e) => setZip(e.target.value)} 
                maxLength={9} 
                minLength={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-white"
                placeholder="12345"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Skills* (Hold Ctrl/Cmd to select multiple)
            </label>
            <select 
              multiple 
              value={skills} 
              onChange={(e) => setSkills(Array.from(e.target.selectedOptions, option => option.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24 text-black bg-white"
            >
              <option value="skill1">Skill 1</option>
              <option value="skill2">Skill 2</option>
              <option value="skill3">Skill 3</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preference
            </label>
            <textarea 
              value={preference} 
              onChange={(e) => setPreference(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24 resize-none text-black bg-white"
              placeholder="Any preferences"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Availability*
            </label>
            <DatePicker
              selected={availability.length > 0 ? availability[0] : null}
              onChange={(date: Date | null) => {
                if (date) {
                  const dateExists = availability.some(d => d.getTime() === date.getTime());
                  if (dateExists) {
                    // Remove date if it already exists
                    setAvailability(availability.filter(d => d.getTime() !== date.getTime()));
                  } else {
                    // Add date if it doesn't exist
                    setAvailability([...availability, date]);
                  }
                }
              }}
              highlightDates={availability}
              placeholderText="Click to select available dates"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black bg-white"
              inline={false}
              showMonthDropdown
              showYearDropdown
              dropdownMode="select"
              minDate={new Date()}
            />
            <div className="mt-2 text-sm text-gray-600">
              Selected dates: {availability.length === 0 ? 'None' : availability.map(date => date.toLocaleDateString()).join(', ')}
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 font-medium text-lg disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : (profileExists ? 'Update Profile' : 'Save Profile')}
          </button>
        </form>
      </div>

      {/* Profile Summary */}
      <div className="bg-white shadow-lg rounded-lg p-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">Profile Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex"><span className="font-medium text-gray-600 w-24">Name:</span> <span className="text-gray-800">{name || 'Not provided'}</span></div>
          <div className="flex"><span className="font-medium text-gray-600 w-24">State:</span> <span className="text-gray-800">{state || 'Not provided'}</span></div>
          <div className="flex"><span className="font-medium text-gray-600 w-24">Address:</span> <span className="text-gray-800">{[address1, address2].filter(Boolean).join(', ') || 'Not provided'}</span></div>
          <div className="flex"><span className="font-medium text-gray-600 w-24">Zip:</span> <span className="text-gray-800">{zip || 'Not provided'}</span></div>
          <div className="flex"><span className="font-medium text-gray-600 w-24">City:</span> <span className="text-gray-800">{city || 'Not provided'}</span></div>
          <div className="flex"><span className="font-medium text-gray-600 w-24">Skills:</span> <span className="text-gray-800">{skills.length > 0 ? skills.join(', ') : 'Not provided'}</span></div>
          <div className="col-span-1 md:col-span-2">
            <div className="flex"><span className="font-medium text-gray-600 w-24">Preference:</span> <span className="text-gray-800">{preference || 'Not provided'}</span></div>
          </div>
          <div className="col-span-1 md:col-span-2">
            <div className="flex"><span className="font-medium text-gray-600 w-24">Availability:</span> <span className="text-gray-800">{availability.length > 0 ? availability.map(date => date.toDateString()).join(', ') : 'Not provided'}</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
}
