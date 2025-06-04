"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import ChatInterface from '@/components/ChatInterface';
import api from '@/services/api';

export default function CharacterChatPage() {
  const { characterId } = useParams();
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [character, setCharacter] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/');
    } else if (isLoaded && isSignedIn && characterId) {
      loadCharacterAndConversations();
    }
  }, [isLoaded, isSignedIn, characterId, router]);

  const loadCharacterAndConversations = async () => {
    try {
      setLoading(true);
      
      // Fetch character
      const characterResponse = await api.getCharacter(characterId, user.id);
      const foundCharacter = characterResponse.character;
      
      if (!foundCharacter) {
        setError('Character not found');
        setLoading(false);
        return;
      }
      
      setCharacter(foundCharacter);
      
      // Fetch conversations with this character
      const conversationsResponse = await api.getUserConversations(user.id, characterId);
      setConversations(conversationsResponse.conversations);
      
      // If there are conversations, load the most recent one
      if (conversationsResponse.conversations.length > 0) {
        const mostRecent = conversationsResponse.conversations[0];
        const conversationDetail = await api.getConversation(user.id, mostRecent._id);
        setCurrentConversation(conversationDetail.conversation);
      } else {
        // Create a new conversation if none exists
        const newConversationResponse = await api.createConversation(
          user.id, 
          characterId, 
          `Chat with ${foundCharacter.name}`
        );
        setCurrentConversation(newConversationResponse.conversation);
        setConversations([newConversationResponse.conversation]);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error loading character chat:', err);
      setError('Failed to load chat. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewConversation = async () => {
    try {
      setLoading(true);
      const newConversationResponse = await api.createConversation(
        user.id,
        characterId,
        `Chat with ${character.name}`
      );
      
      setCurrentConversation(newConversationResponse.conversation);
      setConversations(prev => [newConversationResponse.conversation, ...prev]);
      setLoading(false);
    } catch (err) {
      console.error('Error creating new conversation:', err);
      setError('Failed to create new conversation');
      setLoading(false);
    }
  };

  const handleSwitchConversation = async (conversationId) => {
    try {
      setLoading(true);
      const conversationDetail = await api.getConversation(user.id, conversationId);
      setCurrentConversation(conversationDetail.conversation);
      setLoading(false);
    } catch (err) {
      console.error('Error switching conversation:', err);
      setError('Failed to switch conversation');
      setLoading(false);
    }
  };

  const handleDeleteConversation = async (conversationId) => {
    try {
      await api.deleteConversation(conversationId, user.id);
      
      // Remove from conversations list
      setConversations(prev => prev.filter(conv => conv._id !== conversationId));
      
      // If current conversation was deleted, switch to another or create new
      if (currentConversation && currentConversation._id === conversationId) {
        if (conversations.length > 1) {
          const nextConversation = conversations.find(conv => conv._id !== conversationId);
          if (nextConversation) {
            handleSwitchConversation(nextConversation._id);
          }
        } else {
          handleCreateNewConversation();
        }
      }
    } catch (err) {
      console.error('Error deleting conversation:', err);
      setError('Failed to delete conversation');
    }
  };

  const handleUpdateConversationTitle = async (conversationId, title) => {
    try {
      await api.updateConversationTitle(conversationId, user.id, title);
      
      // Update conversation in state
      setConversations(prev => 
        prev.map(conv => 
          conv._id === conversationId 
            ? { ...conv, title } 
            : conv
        )
      );
      
      // Update current conversation if it's the one being renamed
      if (currentConversation && currentConversation._id === conversationId) {
        setCurrentConversation(prev => ({ ...prev, title }));
      }
    } catch (err) {
      console.error('Error updating conversation title:', err);
      setError('Failed to update conversation title');
    }
  };

  if (loading) {
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
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
          <button 
            onClick={() => router.push('/characters')}
            className="mt-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
          >
            Back to Characters
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto h-screen flex flex-col">
      {character && currentConversation && (
        <ChatInterface
          character={character}
          conversation={currentConversation}
          conversations={conversations}
          clerkId={user.id}
          onCreateNewConversation={handleCreateNewConversation}
          onSwitchConversation={handleSwitchConversation}
          onDeleteConversation={handleDeleteConversation}
          onUpdateConversationTitle={handleUpdateConversationTitle}
        />
      )}
    </div>
  );
} 