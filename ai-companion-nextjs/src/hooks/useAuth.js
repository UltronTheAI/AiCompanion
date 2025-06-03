import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import api from '@/services/api';

/**
 * Custom hook to handle user authentication and verification
 * @returns {Object} Auth state and methods
 */
export default function useAuth() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [isVerifying, setIsVerifying] = useState(false);
  const [dbUser, setDbUser] = useState(null);
  const [error, setError] = useState(null);

  // Verify user with backend when signed in
  useEffect(() => {
    async function verifyUser() {
      if (isLoaded && isSignedIn && user?.id && !dbUser) {
        try {
          setIsVerifying(true);
          setError(null);
          
          const result = await api.verifyUser(user.id);
          
          setDbUser(result.user);
          
          // Log whether user existed or was created
          if (result.exists) {
            console.log('User verified successfully');
          } else {
            console.log('User created successfully');
          }
        } catch (err) {
          console.error('Failed to verify user:', err);
          setError(err.message || 'Failed to verify user');
        } finally {
          setIsVerifying(false);
        }
      }
    }

    verifyUser();
  }, [isLoaded, isSignedIn, user, dbUser]);

  return {
    isLoaded,
    isSignedIn,
    clerkUser: user,
    dbUser,
    isVerifying,
    error,
  };
} 