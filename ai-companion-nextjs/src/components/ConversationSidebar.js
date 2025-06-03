"use client";

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import styles from './ConversationSidebar.module.css';

const ConversationSidebar = ({
  character,
  conversations,
  currentConversationId,
  onCreateNewConversation,
  onSwitchConversation,
  onDeleteConversation,
  onUpdateConversationTitle
}) => {
  const [editingConversationId, setEditingConversationId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  
  const handleCreateNew = () => {
    onCreateNewConversation();
  };
  
  const handleSwitchConversation = (conversationId) => {
    if (conversationId !== currentConversationId) {
      onSwitchConversation(conversationId);
    }
  };
  
  const startEditingTitle = (conversation) => {
    setEditingConversationId(conversation._id);
    setEditTitle(conversation.title);
  };
  
  const cancelEditingTitle = () => {
    setEditingConversationId(null);
    setEditTitle('');
  };
  
  const saveTitle = (conversationId) => {
    if (editTitle.trim()) {
      onUpdateConversationTitle(conversationId, editTitle.trim());
    }
    setEditingConversationId(null);
    setEditTitle('');
  };
  
  const handleKeyDown = (e, conversationId) => {
    if (e.key === 'Enter') {
      saveTitle(conversationId);
    } else if (e.key === 'Escape') {
      cancelEditingTitle();
    }
  };
  
  const handleDeleteConversation = (e, conversationId) => {
    e.stopPropagation();
    
    if (window.confirm('Are you sure you want to delete this conversation? This cannot be undone.')) {
      onDeleteConversation(conversationId);
    }
  };
  
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  return (
    <div className={styles.sidebarContainer}>
      <div className={styles.sidebarHeader}>
        <h2 className={styles.sidebarTitle}>Conversations</h2>
        <button 
          className={styles.newChatButton}
          onClick={handleCreateNew}
        >
          New Chat
        </button>
      </div>
      
      <div className={styles.conversationsList}>
        {conversations.length === 0 ? (
          <div className={styles.emptyState}>
            No conversations yet
          </div>
        ) : (
          conversations.map(conversation => (
            <div 
              key={conversation._id}
              className={`${styles.conversationItem} ${conversation._id === currentConversationId ? styles.active : ''}`}
              onClick={() => handleSwitchConversation(conversation._id)}
            >
              {editingConversationId === conversation._id ? (
                <div className={styles.editTitleContainer}>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, conversation._id)}
                    className={styles.editTitleInput}
                    autoFocus
                  />
                  <div className={styles.editActions}>
                    <button 
                      onClick={() => saveTitle(conversation._id)}
                      className={styles.saveButton}
                    >
                      Save
                    </button>
                    <button 
                      onClick={cancelEditingTitle}
                      className={styles.cancelButton}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.conversationInfo}>
                    <div className={styles.conversationTitle}>
                      {conversation.title}
                    </div>
                    <div className={styles.conversationMeta}>
                      <span className={styles.messageCount}>
                        {conversation.messageCount} messages
                      </span>
                      <span className={styles.conversationDate}>
                        {formatDate(conversation.updatedAt)}
                      </span>
                    </div>
                  </div>
                  <div className={styles.conversationActions}>
                    <button 
                      className={styles.editButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditingTitle(conversation);
                      }}
                      aria-label="Edit conversation title"
                    >
                      ✏️
                    </button>
                    <button 
                      className={styles.deleteButton}
                      onClick={(e) => handleDeleteConversation(e, conversation._id)}
                      aria-label="Delete conversation"
                    >
                      🗑️
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
      
      <div className={styles.sidebarFooter}>
        <div className={styles.characterInfo}>
          <div className={styles.characterName}>
            {character.name}
          </div>
          {character.description && (
            <div className={styles.characterDescription}>
              {character.description.length > 100 
                ? `${character.description.substring(0, 100)}...` 
                : character.description}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationSidebar; 