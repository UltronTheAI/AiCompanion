"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/services/api';
import styles from './ChatInterface.module.css';
import ConversationSidebar from './ConversationSidebar';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import PinnedMessages from './PinnedMessages';
import CharacterEmotions from './CharacterEmotions';
import { isValidObjectId, hasValidObjectId } from '@/utils/validation';

const ChatInterface = ({
  character,
  conversation,
  conversations,
  clerkId,
  onCreateNewConversation,
  onSwitchConversation,
  onDeleteConversation,
  onUpdateConversationTitle
}) => {
  const router = useRouter();
  const [messages, setMessages] = useState(conversation?.messages || []);
  const [pinnedMessages, setPinnedMessages] = useState(conversation?.pinnedMessages || []);
  const [isSending, setIsSending] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef(null);
  const pinnedMessagesRef = useRef(null);

  useEffect(() => {
    // Update messages when conversation changes
    if (conversation && conversation.messages) {
      setMessages(conversation.messages);
      setPinnedMessages(conversation.pinnedMessages || []);
      
      // No need to validate here as we'll validate in fetchPinnedMessages
    }
  }, [conversation]);

  useEffect(() => {
    // Scroll to bottom when messages change
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Fetch pinned messages on component mount and when conversation changes
    if (conversation?._id) {
      fetchPinnedMessages();
    }
  }, [conversation?._id]);

  const fetchPinnedMessages = async () => {
    try {
      if (!conversation || !conversation._id) {
        console.warn('ChatInterface: No valid conversation ID available');
        return;
      }
      
      // No need to validate here as the API will handle validation
      
      console.log('ChatInterface: Fetching pinned messages for conversation', conversation._id);
      
      // Don't make an API call if we already have the pinned messages in the conversation object
      if (conversation.pinnedMessages && Array.isArray(conversation.pinnedMessages)) {
        console.log('ChatInterface: Using pinned messages from conversation object:', conversation.pinnedMessages);
        setPinnedMessages(conversation.pinnedMessages);
        return;
      }
      
      // Otherwise, fetch from the API
      const response = await api.getPinnedMessages(conversation._id, clerkId);
      
      // Check if response has pinnedMessages property
      if (response && Array.isArray(response.pinnedMessages)) {
        console.log('ChatInterface: Received pinned messages:', response.pinnedMessages.length);
        // Extract just the message IDs for the state
        const pinnedIds = response.pinnedMessages.map(msg => msg.id);
        setPinnedMessages(pinnedIds);
      } else {
        console.warn('ChatInterface: Invalid pinned messages response', response);
        setPinnedMessages([]);
      }
    } catch (err) {
      console.error('ChatInterface: Error fetching pinned messages:', err);
      // Don't update state on error to keep any existing pinned messages
      // Don't show error messages to the user
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (messageText) => {
    if (!messageText.trim()) return;
    
    try {
      setIsSending(true);
      setError(null);
      
      // Optimistically update UI with user message
      const tempUserMessage = {
        id: `temp_${Date.now()}`,
        role: 'user',
        content: messageText,
        timestamp: new Date(),
        pending: true
      };
      
      setMessages(prev => [...prev, tempUserMessage]);
      
      // Send message to API
      const response = await api.sendMessage(conversation._id, clerkId, messageText);
      
      // Update UI with AI response
      setMessages(prev => [
        ...prev.filter(msg => msg.id !== tempUserMessage.id), // Remove temp message
        { // Add actual user message
          id: `msg_${Date.now()}_user`,
          role: 'user',
          content: messageText,
          timestamp: new Date()
        },
        response.message // Add AI response
      ]);
      
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
      
      // Remove pending message on error
      setMessages(prev => prev.filter(msg => !msg.pending));
    } finally {
      setIsSending(false);
    }
  };

  const handleRegenerateResponse = async () => {
    try {
      setIsRegenerating(true);
      setError(null);
      
      // Find the last AI message and mark it as regenerating
      const lastAiMessageIndex = [...messages].reverse().findIndex(msg => msg.role === 'assistant');
      
      if (lastAiMessageIndex !== -1) {
        const actualIndex = messages.length - 1 - lastAiMessageIndex;
        const updatedMessages = [...messages];
        updatedMessages[actualIndex] = {
          ...updatedMessages[actualIndex],
          regenerating: true
        };
        setMessages(updatedMessages);
      }
      
      // Call API to regenerate response
      const response = await api.regenerateMessage(conversation._id, clerkId);
      
      // Update messages with new response
      setMessages(prev => {
        // Find and remove the last AI message
        const lastAiIndex = [...prev].reverse().findIndex(msg => msg.role === 'assistant');
        if (lastAiIndex !== -1) {
          const actualIndex = prev.length - 1 - lastAiIndex;
          return [
            ...prev.slice(0, actualIndex),
            response.message
          ];
        }
        return [...prev, response.message];
      });
      
    } catch (err) {
      console.error('Error regenerating response:', err);
      setError('Failed to regenerate response. Please try again.');
      
      // Remove regenerating flag on error
      setMessages(prev => 
        prev.map(msg => ({
          ...msg,
          regenerating: false
        }))
      );
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleEditMessage = async (messageId, newContent) => {
    try {
      setError(null);
      
      // Optimistically update UI
      const messageIndex = messages.findIndex(msg => msg.id === messageId);
      if (messageIndex === -1) return;
      
      const updatedMessages = [...messages];
      updatedMessages[messageIndex] = {
        ...updatedMessages[messageIndex],
        content: newContent,
        edited: true,
        editedAt: new Date()
      };
      
      // Remove all messages after this one
      const messagesToKeep = updatedMessages.slice(0, messageIndex + 1);
      setMessages(messagesToKeep);
      
      // Call API to edit message
      await api.editMessage(conversation._id, messageId, clerkId, newContent);
      
      // After editing, we need to regenerate the AI response
      setIsSending(true);
      const response = await api.regenerateMessage(conversation._id, clerkId);
      
      // Add the new AI response
      setMessages(prev => [...prev, response.message]);
      
    } catch (err) {
      console.error('Error editing message:', err);
      setError('Failed to edit message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      setError(null);
      
      // Optimistically update UI
      const messageIndex = messages.findIndex(msg => msg.id === messageId);
      if (messageIndex === -1) return;
      
      // Remove this message and all messages after it
      const messagesToKeep = messages.slice(0, messageIndex);
      setMessages(messagesToKeep);
      
      // Call API to delete message
      await api.deleteMessage(conversation._id, messageId, clerkId);
      
    } catch (err) {
      console.error('Error deleting message:', err);
      setError('Failed to delete message. Please try again.');
    }
  };

  const handlePinMessage = async (messageId) => {
    try {
      // Don't show error messages
      setError(null);
      
      // Validate conversation ID
      if (!hasValidObjectId(conversation)) {
        console.error('Invalid conversation ID format. Please refresh the page.');
        return;
      }
      
      // Find the message to make sure it exists
      const message = messages.find(msg => msg.id === messageId);
      if (!message) {
        console.error('Message not found');
        return;
      }
      
      // Check if message is already pinned
      const isPinned = pinnedMessages.includes(messageId);
      
      if (isPinned) {
        // Unpin the message
        await api.unpinMessage(conversation._id, messageId, clerkId);
        setPinnedMessages(prev => prev.filter(id => id !== messageId));
        // Don't show success message
      } else {
        // Pin the message
        const response = await api.pinMessage(conversation._id, messageId, clerkId);
        setPinnedMessages(prev => [...prev, messageId]);
        // Don't show success message
      }
      
      // Don't automatically open settings panel
      
      // Refresh pinned messages list if it's already visible
      if (showSettings && pinnedMessagesRef.current) {
        pinnedMessagesRef.current.refresh();
      }
    } catch (err) {
      console.error('Error pinning/unpinning message:', err);
      // Don't show error messages
    }
  };

  const handleClearConversation = async () => {
    if (!window.confirm('Are you sure you want to clear this conversation? This cannot be undone.')) {
      return;
    }
    
    try {
      setError(null);
      
      // Optimistically clear messages
      setMessages([]);
      
      // Call API to clear conversation
      await api.clearConversation(conversation._id, clerkId);
      
    } catch (err) {
      console.error('Error clearing conversation:', err);
      setError('Failed to clear conversation. Please try again.');
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  const toggleSettings = () => {
    setShowSettings(prev => {
      // If opening settings, refresh pinned messages
      if (!prev && pinnedMessagesRef.current) {
        setTimeout(() => pinnedMessagesRef.current.refresh(), 100);
      }
      return !prev;
    });
  };

  const handleCharacterUpdate = (updatedCharacter) => {
    // This would be called when character emotions are updated
    // You could update the character state here if needed
  };

  return (
    <div className={styles.chatContainer}>
      <div className={`${styles.sidebar} ${sidebarOpen ? styles.open : styles.closed}`}>
        <ConversationSidebar
          character={character}
          conversations={conversations}
          currentConversationId={conversation._id}
          onCreateNewConversation={onCreateNewConversation}
          onSwitchConversation={onSwitchConversation}
          onDeleteConversation={onDeleteConversation}
          onUpdateConversationTitle={onUpdateConversationTitle}
        />
      </div>
      
      <div className={styles.chatMain}>
        <div className={styles.chatHeader}>
          <button 
            className={styles.sidebarToggle}
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? '←' : '→'}
          </button>
          
          <div className={styles.characterInfo}>
            {character.avatarUrl ? (
              <img 
                src={character.avatarUrl} 
                alt={character.name}
                className={styles.characterAvatar}
              />
            ) : (
              <div className={styles.characterAvatarPlaceholder}>
                {character.name.charAt(0).toUpperCase()}
              </div>
            )}
            <h2 className={styles.characterName}>{character.name}</h2>
          </div>
          
          <div className={styles.chatActions}>
            <button
              className={`${styles.settingsButton} ${showSettings ? styles.active : ''}`}
              onClick={toggleSettings}
              aria-label="Character settings"
              title="Character settings"
            >
              ⚙️
            </button>
            <button
              className={styles.clearButton}
              onClick={handleClearConversation}
              disabled={messages.length === 0}
            >
              Clear Chat
            </button>
            <Link
              href={`/characters/${character._id}`}
              className={styles.viewButton}
            >
              View Character
            </Link>
          </div>
        </div>
        
        {showSettings && (
          <div className={styles.settingsPanel}>
            <CharacterEmotions 
              character={character} 
              clerkId={clerkId} 
              onUpdate={handleCharacterUpdate} 
            />
            <PinnedMessages 
              conversationId={conversation._id} 
              clerkId={clerkId}
              ref={pinnedMessagesRef}
              onUpdate={fetchPinnedMessages}
              conversation={conversation}
            />
          </div>
        )}
        
        <div className={styles.chatMessages}>
          {messages.length === 0 ? (
            <div className={styles.emptyChat}>
              <div className={styles.emptyChatIcon}>💬</div>
              <h3>Start a conversation with {character.name}</h3>
              <p>Send a message to begin chatting</p>
            </div>
          ) : (
            <MessageList
              messages={messages}
              character={character}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              onPinMessage={handlePinMessage}
              onRegenerateResponse={handleRegenerateResponse}
              isRegenerating={isRegenerating}
              pinnedMessages={pinnedMessages}
            />
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}
        
        <div className={styles.chatInputContainer}>
          <MessageInput 
            onSendMessage={handleSendMessage}
            disabled={isSending || isRegenerating}
            isLoading={isSending}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatInterface; 