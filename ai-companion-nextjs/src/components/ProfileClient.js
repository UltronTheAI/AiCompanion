'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';
import useAuth from '@/hooks/useAuth';
import ProfileForm from './ProfileForm';
import styles from './ProfileClient.module.css';

export default function ProfileClient() {
  const router = useRouter();
  const { isLoaded, isSignedIn, clerkUser, dbUser, isVerifying, error } = useAuth();
  const [updatedUser, setUpdatedUser] = useState(null);
  
  // Handle profile update
  const handleProfileUpdate = (user) => {
    setUpdatedUser(user);
  };
  
  if (!isLoaded) {
    return (
      <div className={styles.loading}>
        <p>Loading...</p>
      </div>
    );
  }
  
  return (
    <>
      <SignedIn>
        <div className={styles.profileContainer}>
          <div className={styles.header}>
            <h1 className={styles.title}>Your Profile</h1>
            <button 
              onClick={() => router.push('/')}
              className={styles.backButton}
            >
              Back to Home
            </button>
          </div>
          
          {isVerifying ? (
            <div className={styles.loading}>
              <p>Verifying your account...</p>
            </div>
          ) : error ? (
            <div className={styles.error}>
              <p>Error: {error}</p>
              <button 
                onClick={() => router.push('/')}
                className={styles.button}
              >
                Back to Home
              </button>
            </div>
          ) : (
            <ProfileForm 
              dbUser={updatedUser || dbUser} 
              onProfileUpdate={handleProfileUpdate} 
            />
          )}
        </div>
      </SignedIn>
      
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
} 