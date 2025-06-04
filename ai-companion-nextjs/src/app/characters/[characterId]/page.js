"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import api from '@/services/api';
import styles from '../characters.module.css';

export default function CharacterDetailsPage() {
  const { characterId } = useParams();
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading character details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg overflow-hidden">
            <div className="p-6">
              <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 rounded-r mb-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => router.push('/characters')}
                className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-md shadow-sm transition-colors duration-200"
              >
                <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Characters
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg overflow-hidden">
            <div className="p-6">
              <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-500 p-4 rounded-r mb-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700 dark:text-yellow-200">Character not found</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => router.push('/characters')}
                className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-md shadow-sm transition-colors duration-200"
              >
                <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Characters
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
              Character Profile
            </span>
          </h1>
          <Link 
            href="/characters" 
            className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors duration-200"
          >
            <svg className="mr-1.5 h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </Link>
        </div>
        
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl overflow-hidden">
          {/* Hero section with character image and basic info */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-600/20"></div>
            <div className="relative px-4 py-8 sm:px-6 sm:py-16 lg:py-20 lg:px-8">
              <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-8">
                <div className="flex-shrink-0">
                  <div className="relative w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full overflow-hidden ring-4 ring-white dark:ring-gray-700 shadow-xl">
                    {character.avatarUrl ? (
                      <img 
                        src={character.avatarUrl} 
                        alt={character.name} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500 text-white text-4xl font-bold">
                        {character.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    
                    {/* Circular Chat Button */}
                    <Link 
                      href={`/chat/${character._id}`} 
                      className="absolute -bottom-3 -right-3 w-12 h-12 flex items-center justify-center rounded-full border-2 border-blue-500 bg-white dark:bg-gray-800 text-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors duration-200 shadow-lg"
                      aria-label={`Chat with ${character.name}`}
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </Link>
                  </div>
                </div>
                <div className="text-center md:text-left">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">{character.name}</h2>
                  <div className="mt-2 flex flex-wrap justify-center md:justify-start gap-2">
                    {character.age && (
                      <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs sm:text-sm font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                        Age: {character.age}
                      </div>
                    )}
                    
                    {/* Conversation Stats */}
                    {character.conversationCount !== undefined && (
                      <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs sm:text-sm font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                        <svg className="mr-1 h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                        </svg>
                        {character.conversationCount} {character.conversationCount === 1 ? 'conversation' : 'conversations'}
                      </div>
                    )}
                    
                    {/* Last Active Time */}
                    {character.lastInteraction && (
                      <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs sm:text-sm font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                        <svg className="mr-1 h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Active {timeAgo(character.lastInteraction)}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 sm:mt-6">
                    <Link 
                      href={`/characters/edit/${character._id}`} 
                      className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors duration-200"
                    >
                      <svg className="mr-1.5 h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Profile
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Character details content */}
          <div className="px-4 py-6 sm:py-8 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              {/* Description */}
              <div className="lg:col-span-2">
                <div className="mb-6 sm:mb-8">
                  <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-900 dark:text-white flex items-center">
                    <svg className="mr-2 h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    About {character.name}
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 sm:p-6">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed text-sm sm:text-base">
                      {character.description || "No description provided."}
                    </p>
                  </div>
                </div>

                {/* Personality */}
                {character.personality && (
                  <div className="mb-6 sm:mb-8">
                    <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-900 dark:text-white flex items-center">
                      <svg className="mr-2 h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Personality
                    </h3>
                    
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 sm:p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
                        <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm">
                          <div className="font-medium text-gray-500 dark:text-gray-400 text-xs sm:text-sm mb-1">Voice</div>
                          <div className="text-gray-900 dark:text-white text-sm sm:text-base">{character.personality.voice || "Default"}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm">
                          <div className="font-medium text-gray-500 dark:text-gray-400 text-xs sm:text-sm mb-1">Speech Style</div>
                          <div className="text-gray-900 dark:text-white text-sm sm:text-base">{character.personality.speechStyle || "Conversational"}</div>
                        </div>
                      </div>

                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3 sm:mb-4 text-sm sm:text-base">Emotional Profile</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                        {character.personality.emotions && Object.entries(character.personality.emotions).map(([emotion, value]) => (
                          <div key={emotion} className="bg-white dark:bg-gray-700 p-3 sm:p-4 rounded-lg shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                              <div className="capitalize font-medium text-gray-900 dark:text-white text-xs sm:text-sm">{emotion}</div>
                              <div className="text-xs font-medium text-blue-600 dark:text-blue-400">{value}/100</div>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 sm:h-2">
                              <div 
                                className={`h-1.5 sm:h-2 rounded-full ${getEmotionColor(emotion)}`}
                                style={{ width: `${value}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1">
                {/* Interests */}
                {character.interests && character.interests.length > 0 && (
                  <div className="mb-6 sm:mb-8">
                    <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-900 dark:text-white flex items-center">
                      <svg className="mr-2 h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      Interests
                    </h3>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 sm:p-6">
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {character.interests.map((interest, index) => (
                          <span 
                            key={index} 
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs sm:text-sm font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Creation Info */}
                <div className="mb-6 sm:mb-8">
                  <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-900 dark:text-white flex items-center">
                    <svg className="mr-2 h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Details
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 sm:p-6">
                    <div className="space-y-3 sm:space-y-4 text-sm sm:text-base">
                      <div className="flex justify-between">
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</div>
                        <div className="text-gray-900 dark:text-white">{formatDate(character.createdAt)}</div>
                      </div>
                      <div className="flex justify-between">
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</div>
                        <div className="text-gray-900 dark:text-white">{formatDate(character.updatedAt)}</div>
                      </div>
                      
                      {/* Mobile-only conversation stats (will be hidden on lg screens) */}
                      <div className="block lg:hidden pt-2 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex flex-col space-y-3">
                          {character.conversationCount !== undefined && (
                            <div className="flex justify-between">
                              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Conversations</div>
                              <div className="text-gray-900 dark:text-white">{character.conversationCount}</div>
                            </div>
                          )}
                          {character.lastInteraction && (
                            <div className="flex justify-between">
                              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Active</div>
                              <div className="text-gray-900 dark:text-white">{timeAgo(character.lastInteraction)}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Chat Button (Mobile Only) */}
                    <div className="block sm:hidden mt-6">
                      <Link 
                        href={`/chat/${character._id}`} 
                        className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow transition-colors duration-200"
                      >
                        <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        Chat with {character.name}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to format dates
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

// Helper function to display time ago
function timeAgo(dateString) {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;
  }
  
  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'} ago`;
}

// Helper function to get emotion color
function getEmotionColor(emotion) {
  const colors = {
    happiness: 'bg-yellow-500',
    anger: 'bg-red-500',
    sadness: 'bg-blue-500',
    excitement: 'bg-green-500',
    curiosity: 'bg-purple-500'
  };
  
  return colors[emotion] || 'bg-gray-500';
} 