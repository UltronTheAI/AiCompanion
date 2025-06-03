"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/services/api';
import styles from './ChatInterface.module.css';
import ConversationSidebar from './ConversationSidebar';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

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
  const [isSending, setIsSending] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Update messages when conversation changes
    if (conversation && conversation.messages) {
      setMessages(conversation.messages);
    }
  }, [conversation]);

  useEffect(() => {
    // Scroll to bottom when messages change
    scrollToBottom();
  }, [messages]);

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
              onRegenerateResponse={handleRegenerateResponse}
              isRegenerating={isRegenerating}
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