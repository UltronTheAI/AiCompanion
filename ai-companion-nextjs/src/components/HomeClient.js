'use client';

import { useEffect } from 'react';
import useAuth from '@/hooks/useAuth';
import styles from '@/app/page.module.css';

export default function HomeClient() {
  const { isLoaded, isSignedIn, clerkUser, dbUser, isVerifying, error } = useAuth();

  useEffect(() => {
    // Log authentication state changes
    if (isLoaded) {
      console.log('Auth state:', { isSignedIn, userId: clerkUser?.id });
    }
  }, [isLoaded, isSignedIn, clerkUser]);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Welcome to AI Companion</h1>
      <p className={styles.description}>Your personal AI assistant</p>
      
      {isLoaded && isSignedIn && (
        <div className={styles.userInfo}>
          {isVerifying ? (
            <p>Verifying your account...</p>
          ) : error ? (
            <p className={styles.error}>Error: {error}</p>
          ) : dbUser ? (
            <p>Welcome back, {clerkUser.firstName || 'User'}!</p>
          ) : null}
        </div>
      )}
    </div>
  );
} 