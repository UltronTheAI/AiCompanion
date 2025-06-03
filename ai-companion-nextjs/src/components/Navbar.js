import Link from 'next/link';
import { UserButton, SignInButton, SignedIn, SignedOut } from '@clerk/nextjs';
import styles from './Navbar.module.css';

const Navbar = () => {
  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>🤖</span>
          AI Companion
        </Link>
        
        <div className={styles.navLinks}>
          <SignedIn>
            <Link href="/characters" className={styles.navLink}>
              Characters
            </Link>
            <Link href="/profile" className={styles.navLink}>
              Profile
            </Link>
          </SignedIn>
        </div>
        
        <div className={styles.authButtons}>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className={styles.signInButton}>
                Sign In
              </button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 