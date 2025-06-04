"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import styles from './CharacterForm.module.css';

const CharacterForm = ({ clerkId, character, isEditing = false }) => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    description: '',
    interests: [],
    firstMessageType: 'none',
    firstMessageText: ''
  });
  const [interestInput, setInterestInput] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [randomizing, setRandomizing] = useState(false);

  // Populate form data if editing
  useEffect(() => {
    if (isEditing && character) {
      setFormData({
        name: character.name || '',
        age: character.age || '',
        description: character.description || '',
        interests: character.interests || [],
        firstMessageType: character.firstMessage?.type || 'none',
        firstMessageText: character.firstMessage?.text || ''
      });

      if (character.avatarUrl) {
        setImagePreview(character.avatarUrl);
      }
    }
  }, [isEditing, character]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleInterestKeyDown = (e) => {
    if (e.key === 'Enter' && interestInput.trim()) {
      e.preventDefault();
      addInterest();
    }
  };

  const addInterest = () => {
    if (!interestInput.trim()) return;
    
    if (formData.interests.length >= 50) {
      setErrors(prev => ({
        ...prev,
        interests: 'Maximum of 50 interests allowed'
      }));
      return;
    }
    
    if (interestInput.length > 50) {
      setErrors(prev => ({
        ...prev,
        interestInput: 'Interest must be 50 characters or less'
      }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      interests: [...prev.interests, interestInput.trim()]
    }));
    setInterestInput('');
    
    // Clear interest errors
    if (errors.interests || errors.interestInput) {
      setErrors(prev => ({
        ...prev,
        interests: null,
        interestInput: null
      }));
    }
  };

  const removeInterest = (index) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.filter((_, i) => i !== index)
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({
        ...prev,
        image: 'Please select an image file'
      }));
      return;
    }
    
    setImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
    
    // Clear image error
    if (errors.image) {
      setErrors(prev => ({
        ...prev,
        image: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Name must be 100 characters or less';
    }
    
    if (formData.description && formData.description.length > 1000) {
      newErrors.description = 'Description must be 1000 characters or less';
    }
    
    if (formData.age && (isNaN(formData.age) || formData.age < 0)) {
      newErrors.age = 'Age must be a positive number';
    }
    
    if (formData.firstMessageType === 'fixed' && !formData.firstMessageText.trim()) {
      newErrors.firstMessageText = 'First message text is required when type is fixed';
    }
    
    if (formData.firstMessageText && formData.firstMessageText.length > 1000) {
      newErrors.firstMessageText = 'First message text must be 1000 characters or less';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      
      // Determine if we're using an external avatar URL
      const isExternalAvatar = imagePreview && !imageFile && imagePreview.startsWith('http');
      
      if (isEditing) {
        // Update character
        await api.updateCharacter(character._id, clerkId, {
          name: formData.name,
          age: formData.age ? parseInt(formData.age) : null,
          description: formData.description,
          interests: formData.interests,
          firstMessageType: formData.firstMessageType,
          firstMessageText: formData.firstMessageText,
          // Include the external avatar URL if using one
          avatarUrl: isExternalAvatar ? imagePreview : undefined
        });
        
        // If local image file exists, upload it
        if (imageFile) {
          const reader = new FileReader();
          reader.onload = async () => {
            try {
              await api.uploadCharacterImage(
                character._id,
                clerkId,
                reader.result
              );
              
              // Redirect to characters page after successful update
              router.push('/characters');
            } catch (error) {
              console.error('Error uploading character image:', error);
              setErrors(prev => ({
                ...prev,
                submit: 'Character updated but image upload failed. You can try uploading the image later.'
              }));
              setLoading(false);
            }
          };
          reader.readAsDataURL(imageFile);
        } else {
          // Redirect to characters page if no image to upload
          router.push('/characters');
        }
      } else {
        // Create character
        const characterResponse = await api.createCharacter(clerkId, {
          name: formData.name,
          age: formData.age ? parseInt(formData.age) : null,
          description: formData.description,
          interests: formData.interests,
          firstMessageType: formData.firstMessageType,
          firstMessageText: formData.firstMessageText,
          // Include the external avatar URL if using one
          avatarUrl: isExternalAvatar ? imagePreview : undefined
        });
        
        // If local image file exists, upload it
        if (imageFile && characterResponse.character._id) {
          const reader = new FileReader();
          reader.onload = async () => {
            try {
              await api.uploadCharacterImage(
                characterResponse.character._id,
                clerkId,
                reader.result
              );
              
              // Redirect to characters page after successful creation
              router.push('/characters');
            } catch (error) {
              console.error('Error uploading character image:', error);
              setErrors(prev => ({
                ...prev,
                submit: 'Character created but image upload failed. You can try uploading the image later.'
              }));
              setLoading(false);
            }
          };
          reader.readAsDataURL(imageFile);
        } else {
          // Redirect to characters page if no image to upload
          router.push('/characters');
        }
      }
    } catch (error) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} character:`, error);
      setErrors(prev => ({
        ...prev,
        submit: error.message || `Failed to ${isEditing ? 'update' : 'create'} character. Please try again.`
      }));
      setLoading(false);
    }
  };

  const handleRandomize = async () => {
    try {
      setRandomizing(true);
      setErrors({});
      
      // Call the API to get a random character
      const randomCharacter = await api.getRandomCharacter();
      
      // Update the form data with the random character details
      setFormData(prev => ({
        ...prev,
        name: randomCharacter.name,
        age: randomCharacter.age.toString(),
        description: randomCharacter.description,
        interests: randomCharacter.interests,
        firstMessageType: 'fixed',
        firstMessageText: randomCharacter.greeting || ''
      }));
      
      // Set the avatar image preview if avatarUrl is provided
      if (randomCharacter.avatarUrl) {
        setImagePreview(randomCharacter.avatarUrl);
        // We don't set imageFile because we're using an external URL
        // The backend will handle this URL separately
      }
      
    } catch (error) {
      console.error('Error generating random character:', error);
      setErrors(prev => ({
        ...prev,
        submit: error.message || 'Failed to generate random character. Please try again.'
      }));
    } finally {
      setRandomizing(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <form onSubmit={handleSubmit} className={styles.form}>
        {errors.submit && (
          <div className={styles.errorMessage}>{errors.submit}</div>
        )}
        
        <div className={styles.formHeader}>
          <h2 className={styles.formTitle}>{isEditing ? 'Edit Character' : 'Create Character'}</h2>
          {!isEditing && (
            <button
              type="button"
              onClick={handleRandomize}
              className={styles.randomizeButton}
              disabled={randomizing || loading}
            >
              {randomizing ? 'Generating...' : 'Randomize'}
            </button>
          )}
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="name" className={styles.label}>
            Name <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={styles.input}
            placeholder="Character name"
            maxLength={100}
            required
          />
          {errors.name && <div className={styles.fieldError}>{errors.name}</div>}
          <div className={styles.charCount}>
            {formData.name.length}/100 characters
          </div>
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="age" className={styles.label}>Age</label>
          <input
            type="number"
            id="age"
            name="age"
            value={formData.age}
            onChange={handleChange}
            className={styles.input}
            placeholder="Character age (optional)"
            min="0"
          />
          {errors.age && <div className={styles.fieldError}>{errors.age}</div>}
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="description" className={styles.label}>Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className={styles.textarea}
            placeholder="Character description (optional)"
            maxLength={1000}
            rows={5}
          />
          {errors.description && (
            <div className={styles.fieldError}>{errors.description}</div>
          )}
          <div className={styles.charCount}>
            {formData.description.length}/1000 characters
          </div>
        </div>
        
        <div className={styles.formGroup}>
          <label className={styles.label}>Interests</label>
          <div className={styles.interestInputContainer}>
            <input
              type="text"
              value={interestInput}
              onChange={(e) => setInterestInput(e.target.value)}
              onKeyDown={handleInterestKeyDown}
              className={styles.input}
              placeholder="Add interests (press Enter)"
              maxLength={50}
            />
            <button
              type="button"
              onClick={addInterest}
              className={styles.addButton}
              disabled={!interestInput.trim()}
            >
              Add
            </button>
          </div>
          {errors.interestInput && (
            <div className={styles.fieldError}>{errors.interestInput}</div>
          )}
          {errors.interests && (
            <div className={styles.fieldError}>{errors.interests}</div>
          )}
          
          {formData.interests.length > 0 && (
            <div className={styles.interestsList}>
              {formData.interests.map((interest, index) => (
                <div key={index} className={styles.interestTag}>
                  {interest}
                  <button
                    type="button"
                    onClick={() => removeInterest(index)}
                    className={styles.removeInterest}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className={styles.interestCount}>
            {formData.interests.length}/50 interests
          </div>
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="firstMessageType" className={styles.label}>First Message</label>
          <div className={styles.radioGroup}>
            <div className={styles.radioOption}>
              <input
                type="radio"
                id="firstMessageNone"
                name="firstMessageType"
                value="none"
                checked={formData.firstMessageType === 'none'}
                onChange={handleChange}
                className={styles.radioInput}
              />
              <label htmlFor="firstMessageNone" className={styles.radioLabel}>
                No first message
              </label>
            </div>
            
            <div className={styles.radioOption}>
              <input
                type="radio"
                id="firstMessageRandom"
                name="firstMessageType"
                value="random"
                checked={formData.firstMessageType === 'random'}
                onChange={handleChange}
                className={styles.radioInput}
              />
              <label htmlFor="firstMessageRandom" className={styles.radioLabel}>
                AI-generated greeting (random)
              </label>
            </div>
            
            <div className={styles.radioOption}>
              <input
                type="radio"
                id="firstMessageFixed"
                name="firstMessageType"
                value="fixed"
                checked={formData.firstMessageType === 'fixed'}
                onChange={handleChange}
                className={styles.radioInput}
              />
              <label htmlFor="firstMessageFixed" className={styles.radioLabel}>
                Custom greeting (fixed)
              </label>
            </div>
          </div>
          
          {formData.firstMessageType === 'fixed' && (
            <div className={styles.firstMessageTextContainer}>
              <textarea
                id="firstMessageText"
                name="firstMessageText"
                value={formData.firstMessageText}
                onChange={handleChange}
                className={styles.textarea}
                placeholder="Enter the greeting message your character will use to start conversations"
                maxLength={1000}
                rows={3}
                required={formData.firstMessageType === 'fixed'}
              />
              {errors.firstMessageText && (
                <div className={styles.fieldError}>{errors.firstMessageText}</div>
              )}
              <div className={styles.charCount}>
                {formData.firstMessageText.length}/1000 characters
              </div>
            </div>
          )}
          
          {formData.firstMessageType === 'random' && (
            <div className={styles.infoMessage}>
              The AI will generate a unique greeting message for each new conversation based on the character's personality.
            </div>
          )}
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="image" className={styles.label}>Character Image</label>
          <input
            type="file"
            id="image"
            name="image"
            onChange={handleImageChange}
            accept="image/*"
            className={styles.fileInput}
          />
          {errors.image && <div className={styles.fieldError}>{errors.image}</div>}
          
          {imagePreview && (
            <div className={styles.imagePreview}>
              <img src={imagePreview} alt="Character preview" />
            </div>
          )}
        </div>
        
        <div className={styles.formActions}>
          <button
            type="button"
            onClick={() => router.back()}
            className={styles.cancelButton}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Character' : 'Create Character')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CharacterForm; 