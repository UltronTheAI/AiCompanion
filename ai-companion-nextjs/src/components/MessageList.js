"use client";

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import styles from './MessageList.module.css';

const MessageList = ({
  messages,
  character,
  onEditMessage,
  onDeleteMessage,
  onRegenerateResponse,
  isRegenerating
}) => {
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editContent, setEditContent] = useState('');
  
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
  
  return (
    <div className={styles.messageList}>
      {messages.map((message) => (
        <div 
          key={message.id}
          className={`${styles.messageContainer} ${
            message.role === 'user' ? styles.userMessage : styles.aiMessage
          } ${message.pending ? styles.pending : ''} ${message.regenerating ? styles.regenerating : ''}`}
        >
          <div className={styles.messageHeader}>
            <div className={styles.messageAuthor}>
              {message.role === 'user' ? (
                <span>You</span>
              ) : (
                <span>{character.name}</span>
              )}
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
                </div>
              )}
              
              {message.role === 'assistant' && message === messages[messages.length - 1] && (
                <div className={styles.messageActions}>
                  <button 
                    onClick={onRegenerateResponse}
                    className={styles.actionButton}
                    disabled={isRegenerating}
                    aria-label="Regenerate response"
                  >
                    {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
};

export default MessageList; 