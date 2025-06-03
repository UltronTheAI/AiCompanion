import { Suspense } from 'react';
import ProfileClient from '@/components/ProfileClient';
import styles from './profile.module.css';

export const metadata = {
  title: 'Profile | AI Companion',
  description: 'Manage your AI Companion profile',
};

export default function ProfilePage() {
  return (
    <div className={styles.container}>
      <Suspense fallback={
        <div className={styles.loading}>
          <p>Loading profile...</p>
        </div>
      }>
        <ProfileClient />
      </Suspense>
    </div>
  );
} 