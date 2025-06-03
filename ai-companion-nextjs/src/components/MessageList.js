"use client";

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import styles from './MessageList.module.css';
import api from '@/services/api';
import AudioPlayer from './AudioPlayer';

const MessageList = ({
  messages,
  character,
  onEditMessage,
  onDeleteMessage,
  onPinMessage,
  onRegenerateResponse,
  isRegenerating,
  pinnedMessages = []
}) => {
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [audioPlayerVisible, setAudioPlayerVisible] = useState(false);
  const [audioSentences, setAudioSentences] = useState([]);
  const [isLoadingSentences, setIsLoadingSentences] = useState(false);
  const [audioError, setAudioError] = useState(null);
  
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  const startEditing = (message) => {
    setEditingMessageId(message.id);
    setEditContent(message.content);
  };
  
  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditContent('');
  };
  
  const saveEdit = (messageId) => {
    if (editContent.trim()) {
      onEditMessage(messageId, editContent.trim());
    }
    setEditingMessageId(null);
    setEditContent('');
  };
  
  const handleKeyDown = (e, messageId) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      saveEdit(messageId);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };
  
  const handleSpeakerClick = async (message) => {
    try {
      setAudioError(null);
      setIsLoadingSentences(true);
      
      // Get backend URL
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      // Get sentences with tones directly from backend
      const response = await fetch(
        `${backendUrl}/v1/sentences?text=${encodeURIComponent(message.content)}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to get sentences: ${response.status}`);
      }
      
      const sentencesResponse = await response.json();
      
      if (!sentencesResponse || !Array.isArray(sentencesResponse)) {
        throw new Error('Invalid response from sentences API');
      }
      
      // Set sentences and show audio player
      setAudioSentences(sentencesResponse);
      setAudioPlayerVisible(true);
      
    } catch (error) {
      console.error('Error getting sentences:', error);
      setAudioError(`Failed to process text: ${error.message}`);
    } finally {
      setIsLoadingSentences(false);
    }
  };
  
  const closeAudioPlayer = () => {
    setAudioPlayerVisible(false);
    setAudioSentences([]);
  };

  const isPinned = (messageId) => {
    return pinnedMessages && pinnedMessages.includes(messageId);
  };
  
  return (
    <div className={styles.messageList}>
      {messages.map((message) => {
        const pinned = isPinned(message.id);
        return (
          <div 
            key={message.id}
            className={`${styles.messageContainer} ${
              message.role === 'user' ? styles.userMessage : styles.aiMessage
            } ${message.pending ? styles.pending : ''} ${message.regenerating ? styles.regenerating : ''} ${pinned ? styles.pinnedMessage : ''}`}
          >
            <div className={styles.messageHeader}>
              <div className={styles.messageAuthor}>
                {message.role === 'user' ? (
                  <span>You</span>
                ) : (
                  <span>{character.name}</span>
                )}
                {pinned && <span className={styles.pinnedBadge} title="Pinned message">📌</span>}
              </div>
              <div className={styles.messageTime}>
                {formatDate(message.timestamp)}
                {message.edited && <span className={styles.editedTag}>(edited)</span>}
              </div>
            </div>
            
            {editingMessageId === message.id ? (
              <div className={styles.editContainer}>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, message.id)}
                  className={styles.editTextarea}
                  autoFocus
                />
                <div className={styles.editActions}>
                  <button 
                    onClick={() => saveEdit(message.id)}
                    className={styles.saveButton}
                  >
                    Save
                  </button>
                  <button 
                    onClick={cancelEditing}
                    className={styles.cancelButton}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className={styles.messageContent}>
                  {message.content}
                </div>
                
                {message.role === 'user' && (
                  <div className={styles.messageActions}>
                    <button 
                      onClick={() => startEditing(message)}
                      className={styles.actionButton}
                      aria-label="Edit message"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => onDeleteMessage(message.id)}
                      className={styles.actionButton}
                      aria-label="Delete message"
                    >
                      Delete
                    </button>
                    <button 
                      onClick={() => onPinMessage(message.id)}
                      className={styles.actionButton}
                      aria-label={pinned ? "Unpin message" : "Pin message"}
                      title={pinned ? "Remove this message from context" : "Pin this message to keep it in context"}
                    >
                      {pinned ? '📌 Unpin' : '📌 Pin'}
                    </button>
                  </div>
                )}
                
                {message.role === 'assistant' && (
                  <div className={styles.messageActions}>
                    <button 
                      onClick={() => onPinMessage(message.id)}
                      className={styles.actionButton}
                      aria-label={pinned ? "Unpin message" : "Pin message"}
                      title={pinned ? "Remove this message from context" : "Pin this message to keep it in context"}
                    >
                      {pinned ? '📌 Unpin' : '📌 Pin'}
                    </button>
                    
                    {message === messages[messages.length - 1] && (
                      <button 
                        onClick={onRegenerateResponse}
                        className={styles.actionButton}
                        disabled={isRegenerating}
                        aria-label="Regenerate response"
                      >
                        {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
      
      {audioError && (
        <div className={styles.audioError}>
          {audioError}
        </div>
      )}
      
      {audioPlayerVisible && audioSentences.length > 0 && (
        <AudioPlayer 
          onClose={closeAudioPlayer}
          sentences={audioSentences}
          characterVoice={character.personality?.voice || "Zephyr"}
        />
      )}
    </div>
  );
};

export default MessageList; 