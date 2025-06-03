'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import api from '@/services/api';
import styles from './ProfileForm.module.css';

export default function ProfileForm({ dbUser, onProfileUpdate }) {
  const { user: clerkUser } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    displayName: '',
    description: '',
    age: '',
    location: '',
    avatarUrl: '',
    interests: [],
    customVariables: [],
  });

  // New interest and custom variable state
  const [newInterest, setNewInterest] = useState('');
  const [newVariable, setNewVariable] = useState({ name: '', value: '' });

  // Load initial data
  useEffect(() => {
    if (dbUser) {
      setFormData({
        displayName: dbUser.displayName || clerkUser?.firstName || '',
        description: dbUser.description || '',
        age: dbUser.age || '',
        location: dbUser.location || '',
        avatarUrl: dbUser.avatarUrl || clerkUser?.imageUrl || '',
        interests: dbUser.interests || [],
        customVariables: dbUser.customVariables || [],
      });
    }
  }, [dbUser, clerkUser]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Add new interest
  const addInterest = () => {
    if (!newInterest.trim() || formData.interests.length >= 50) return;
    
    setFormData((prev) => ({
      ...prev,
      interests: [...prev.interests, newInterest.trim()],
    }));
    setNewInterest('');
  };

  // Remove interest
  const removeInterest = (index) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.filter((_, i) => i !== index),
    }));
  };

  // Add new custom variable
  const addCustomVariable = () => {
    if (!newVariable.name.trim() || !newVariable.value.trim()) return;
    
    setFormData((prev) => ({
      ...prev,
      customVariables: [...prev.customVariables, { ...newVariable }],
    }));
    setNewVariable({ name: '', value: '' });
  };

  // Remove custom variable
  const removeCustomVariable = (index) => {
    setFormData((prev) => ({
      ...prev,
      customVariables: prev.customVariables.filter((_, i) => i !== index),
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!clerkUser?.id) return;
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);
    
    try {
      // Validate description length
      if (formData.description.length > 500) {
        throw new Error('Description must be 500 characters or less');
      }
      
      // Format age as number if provided
      const formattedData = {
        ...formData,
        age: formData.age ? parseInt(formData.age, 10) : null,
      };
      
      const result = await api.updateUserProfile(clerkUser.id, formattedData);
      
      setSuccess(true);
      if (onProfileUpdate) {
        onProfileUpdate(result.user);
      }
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <h2 className={styles.formTitle}>Edit Profile</h2>
      
      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>Profile updated successfully!</div>}
      
      <form onSubmit={handleSubmit} className={styles.form}>
        {/* <div className={styles.profileImageSection}>
          <div className={styles.imagePreview}>
            {formData.avatarUrl ? (
              <img 
                src={formData.avatarUrl} 
                alt="Profile" 
                className={styles.profileImage}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://via.placeholder.com/150?text=No+Image";
                }}
              />
            ) : (
              <div className={styles.placeholderImage}>
                {formData.displayName ? formData.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="avatarUrl">Profile Image URL</label>
            <input
              type="url"
              id="avatarUrl"
              name="avatarUrl"
              value={formData.avatarUrl}
              onChange={handleChange}
              className={styles.input}
              placeholder="https://example.com/your-image.jpg"
            />
            <p className={styles.imageHelp}>Enter a URL to your profile image</p>
          </div>
        </div> */}
        
        <div className={styles.formGroup}>
          <label htmlFor="displayName">Display Name</label>
          <input
            type="text"
            id="displayName"
            name="displayName"
            value={formData.displayName}
            onChange={handleChange}
            className={styles.input}
            required
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="description">
            Description <span className={styles.charCount}>
              ({formData.description.length}/500)
            </span>
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className={styles.textarea}
            maxLength={500}
            rows={4}
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="age">Age (Optional)</label>
          <input
            type="number"
            id="age"
            name="age"
            value={formData.age}
            onChange={handleChange}
            className={styles.input}
            min={1}
            max={120}
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="location">Location</label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            className={styles.input}
          />
        </div>
        
        <div className={styles.formGroup}>
          <label>
            Interests <span className={styles.charCount}>
              ({formData.interests.length}/50)
            </span>
          </label>
          <div className={styles.interestInput}>
            <input
              type="text"
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              className={styles.input}
              placeholder="Add an interest"
              maxLength={50}
              disabled={formData.interests.length >= 50}
            />
            <button
              type="button"
              onClick={addInterest}
              className={styles.addButton}
              disabled={formData.interests.length >= 50}
            >
              Add
            </button>
          </div>
          
          <div className={styles.tagsList}>
            {formData.interests.map((interest, index) => (
              <div key={index} className={styles.tag}>
                {interest}
                <button
                  type="button"
                  onClick={() => removeInterest(index)}
                  className={styles.removeButton}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
        
        <div className={styles.formGroup}>
          <label>Custom Variables</label>
          <div className={styles.variableInput}>
            <input
              type="text"
              value={newVariable.name}
              onChange={(e) => setNewVariable({ ...newVariable, name: e.target.value })}
              className={styles.input}
              placeholder="Name"
            />
            <input
              type="text"
              value={newVariable.value}
              onChange={(e) => setNewVariable({ ...newVariable, value: e.target.value })}
              className={styles.input}
              placeholder="Value"
            />
            <button
              type="button"
              onClick={addCustomVariable}
              className={styles.addButton}
            >
              Add
            </button>
          </div>
          
          <div className={styles.variablesList}>
            {formData.customVariables.map((variable, index) => (
              <div key={index} className={styles.variable}>
                <strong>{variable.name}:</strong> {variable.value}
                <button
                  type="button"
                  onClick={() => removeCustomVariable(index)}
                  className={styles.removeButton}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
        
        <button
          type="submit"
          className={styles.submitButton}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
} 