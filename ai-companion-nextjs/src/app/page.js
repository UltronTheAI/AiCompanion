import { Suspense } from 'react';
import styles from "./page.module.css";
import HomeClient from '@/components/HomeClient';

export default function Home() {
  return (
    <Suspense fallback={
      <div className={styles.container}>
        <h1 className={styles.title}>Welcome to AI Companion</h1>
        <p className={styles.description}>Your personal AI assistant</p>
        <p>Loading...</p>
      </div>
    }>
      <HomeClient />
    </Suspense>
  );
}
