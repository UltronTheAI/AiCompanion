"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import api from '@/services/api';
import styles from './characters.module.css';

export default function CharactersPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [characters, setCharacters] = useState([]);
  const [error, setError] = useState(null);
  const [limits, setLimits] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [characterToDelete, setCharacterToDelete] = useState(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/');
    } else if (isLoaded && isSignedIn) {
      fetchCharacters();
      fetchLimits();
    }
  }, [isLoaded, isSignedIn, router]);

  const fetchCharacters = async () => {
    try {
      setLoading(true);
      const response = await api.getUserCharacters(user.id);
      setCharacters(response.characters);
      setError(null);
    } catch (err) {
      console.error('Error fetching characters:', err);
      setError('Failed to load characters. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLimits = async () => {
    try {
      const response = await api.getUserLimits(user.id);
      setLimits(response.limits);
    } catch (err) {
      console.error('Error fetching limits:', err);
    }
  };

  const handleDeleteClick = (character) => {
    setCharacterToDelete(character);
  };

  const confirmDelete = async () => {
    if (!characterToDelete) return;
    
    try {
      setIsDeleting(true);
      await api.deleteCharacter(characterToDelete._id, user.id);
      setCharacters(characters.filter(c => c._id !== characterToDelete._id));
      setCharacterToDelete(null);
      fetchLimits(); // Refresh limits after deletion
    } catch (err) {
      console.error('Error deleting character:', err);
      setError('Failed to delete character. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setCharacterToDelete(null);
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className={styles.header}>
        <h1 className="text-2xl font-bold">My AI Characters</h1>
        {limits && (
          <div className={styles.limitsInfo}>
            <span>Characters: {limits.characters.used}/{limits.characters.limit}</span>
          </div>
        )}
        <Link href="/characters/create" className={styles.createButton}>
          Create Character
        </Link>
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}

      {characters.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🤖</div>
          <h2>No characters yet</h2>
          <p>Create your first AI character to get started</p>
          <Link href="/characters/create" className={styles.createEmptyButton}>
            Create Character
          </Link>
        </div>
      ) : (
        <div className={styles.charactersGrid}>
          {characters.map(character => (
            <div key={character._id} className={styles.characterCard}>
              <div className={styles.characterImage}>
                {character.avatarUrl ? (
                  <img src={character.avatarUrl} alt={character.name} />
                ) : (
                  <div className={styles.placeholderImage}>
                    {character.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className={styles.characterInfo}>
                <h3 className={styles.characterName}>
                  <Link href={`/characters/${character._id}`} className="hover:underline">
                    {character.name}
                  </Link>
                </h3>
                {character.age && <p className={styles.characterAge}>Age: {character.age}</p>}
                {character.interests && character.interests.length > 0 && (
                  <div className={styles.interestTags}>
                    {character.interests.slice(0, 3).map((interest, index) => (
                      <span key={index} className={styles.interestTag}>
                        {interest}
                      </span>
                    ))}
                    {character.interests.length > 3 && (
                      <span className={styles.moreTag}>
                        +{character.interests.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className={styles.characterActions}>
                <Link href={`/characters/${character._id}`} className={styles.viewButton}>
                  View
                </Link>
                <Link href={`/chat/${character._id}`} className={styles.chatButton}>
                  Chat
                </Link>
                <Link href={`/characters/edit/${character._id}`} className={styles.editButton}>
                  Edit
                </Link>
                <button 
                  onClick={() => handleDeleteClick(character)} 
                  className={styles.deleteButton}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {characterToDelete && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Delete Character</h3>
            <p>
              Are you sure you want to delete <strong>{characterToDelete.name}</strong>?
              This will also delete all conversations with this character.
            </p>
            <div className={styles.modalActions}>
              <button 
                onClick={cancelDelete} 
                className={styles.cancelButton}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete} 
                className={styles.confirmDeleteButton}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 