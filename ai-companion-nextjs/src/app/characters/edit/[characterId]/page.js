"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import CharacterForm from '@/components/CharacterForm';
import api from '@/services/api';

export default function EditCharacterPage({ params }) {
  const { characterId } = params;
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [character, setCharacter] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/');
    } else if (isLoaded && isSignedIn && characterId) {
      fetchCharacter();
    }
  }, [isLoaded, isSignedIn, router, characterId]);

  const fetchCharacter = async () => {
    try {
      setLoading(true);
      const response = await api.getCharacter(characterId, user.id);
      setCharacter(response.character);
    } catch (err) {
      console.error('Error fetching character:', err);
      setError('Failed to load character. Please try again.');
    } finally {
      setLoading(false);
    }
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

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <button 
          onClick={() => router.push('/characters')}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Back to Characters
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Edit Character</h1>
      {character && (
        <CharacterForm 
          clerkId={user?.id} 
          character={character} 
          isEditing={true} 
        />
      )}
    </div>
  );
} 