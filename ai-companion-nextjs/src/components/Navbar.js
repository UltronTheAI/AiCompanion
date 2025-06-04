"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton, SignInButton, SignedIn, SignedOut } from '@clerk/nextjs';
import styles from './Navbar.module.css';

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  
  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);
  
  // Close mobile menu when window resizes to desktop size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768 && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileMenuOpen]);
  
  const toggleMobileMenu = () => {
    setMobileMenuOpen(prev => !prev);
  };
  
  const isActive = (path) => {
    return pathname === path;
  };
  
  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>🤖</span>
          AI Companion
        </Link>
        
        <div className={styles.navLinks}>
          <SignedIn>
            <Link 
              href="/characters" 
              className={`${styles.navLink} ${isActive('/characters') ? styles.active : ''}`}
            >
              Characters
            </Link>
            <Link 
              href="/profile" 
              className={`${styles.navLink} ${isActive('/profile') ? styles.active : ''}`}
            >
              Profile
            </Link>
          </SignedIn>
        </div>
        
        <button 
          className={styles.mobileMenuButton}
          onClick={toggleMobileMenu}
          aria-label="Toggle mobile menu"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
        
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
      
      {/* Mobile Menu */}
      <div className={`${styles.mobileMenu} ${mobileMenuOpen ? styles.open : ''}`}>
        <SignedIn>
          <Link 
            href="/characters" 
            className={styles.mobileNavLink}
          >
            Characters
          </Link>
          <Link 
            href="/profile" 
            className={styles.mobileNavLink}
          >
            Profile
          </Link>
        </SignedIn>
        <SignedOut>
          <SignInButton mode="modal">
            <button className={styles.signInButton}>
              Sign In
            </button>
          </SignInButton>
        </SignedOut>
      </div>
    </nav>
  );
};

export default Navbar; 