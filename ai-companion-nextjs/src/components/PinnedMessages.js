"use client";

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import api from '@/services/api';
import styles from './PinnedMessages.module.css';
import { isValidObjectId, getObjectIdString } from '@/utils/validation';

const PinnedMessages = forwardRef(({ conversationId, clerkId, onUpdate, conversation }, ref) => {
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Expose the refresh function to parent components
  useImperativeHandle(ref, () => ({
    refresh: fetchPinnedMessages
  }));

  useEffect(() => {
    // Try to use the conversation object directly if available
    if (conversation && conversation.messages && conversation.pinnedMessages) {
      loadPinnedMessagesFromConversation(conversation);
    } else if (conversationId && clerkId) {
      fetchPinnedMessages();
    } else {
      setLoading(false);
    }
  }, [conversation, conversationId, clerkId, retryCount]);

  // Load pinned messages directly from the conversation object
  const loadPinnedMessagesFromConversation = (conversation) => {
    try {
      setLoading(true);
      setError(null);

      if (!conversation.messages || !conversation.pinnedMessages) {
        setPinnedMessages([]);
        setLoading(false);
        return;
      }

      // Find the full message objects for each pinned message ID
      const pinnedMessageIds = conversation.pinnedMessages || [];
      const pinnedMessageObjects = conversation.messages.filter(msg => 
        pinnedMessageIds.includes(msg.id)
      );

      console.log('Found pinned messages in conversation:', pinnedMessageObjects.length);
      setPinnedMessages(pinnedMessageObjects);
      
      // Call the onUpdate callback if provided
      if (onUpdate) {
        onUpdate(pinnedMessageIds);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading pinned messages from conversation:', err);
      setError('Failed to load pinned messages from conversation');
      setLoading(false);
    }
  };

  const fetchPinnedMessages = async () => {
    try {
      // First try to use direct approach without API call
      if (window && window.__NEXT_DATA__ && window.__NEXT_DATA__.props) {
        const pageProps = window.__NEXT_DATA__.props.pageProps;
        if (pageProps && pageProps.conversation) {
          const conv = pageProps.conversation;
          if (conv._id && conv.messages && conv.pinnedMessages) {
            console.log('Using conversation from page props');
            loadPinnedMessagesFromConversation(conv);
            return;
          }
        }
      }

      // Validate inputs
      if (!conversationId) {
        setError('Conversation ID is required');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        // Try to get the conversation from the API
        const response = await api.getPinnedMessages(conversationId, clerkId);
        
        // The server returns the actual message objects, not just IDs
        if (response && Array.isArray(response.pinnedMessages)) {
          setPinnedMessages(response.pinnedMessages);
          
          // Call the onUpdate callback with just the message IDs if provided
          if (onUpdate) {
            const messageIds = response.pinnedMessages.map(msg => msg.id);
            onUpdate(messageIds);
          }
        } else {
          setPinnedMessages([]);
          console.error('Invalid pinned messages response format:', response);
        }
      } catch (apiError) {
        console.error('API error:', apiError);
        setError(`${apiError.message || 'Failed to load pinned messages'}`);
      }
    } catch (err) {
      console.error('Error in fetchPinnedMessages:', err);
      setError(`Failed to load pinned messages: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  const handleUnpin = async (messageId) => {
    try {
      setError(null);
      
      // First update the UI optimistically
      setPinnedMessages(prev => prev.filter(msg => msg.id !== messageId));
      
      // Then try to update via API
      try {
        await api.unpinMessage(conversationId, messageId, clerkId);
        
        // Call the onUpdate callback if provided
        if (onUpdate) {
          const updatedMessageIds = pinnedMessages
            .filter(msg => msg.id !== messageId)
            .map(msg => msg.id);
          onUpdate(updatedMessageIds);
        }
      } catch (apiError) {
        console.error('Error unpinning message via API:', apiError);
        // Don't show error to user, just log it
      }
    } catch (err) {
      console.error('Error in handleUnpin:', err);
      // Don't show error to user
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading pinned messages...</div>;
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>{error}</p>
        <button 
          onClick={handleRetry} 
          className={styles.retryButton}
        >
          Retry
        </button>
      </div>
    );
  }

  if (pinnedMessages.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No pinned messages yet</p>
        <small>Pin important messages to keep them in context (max 5)</small>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Pinned Messages ({pinnedMessages.length}/5)</h3>
      <div className={styles.messageList}>
        {pinnedMessages.map(message => (
          <div key={message.id} className={styles.messageItem}>
            <div className={styles.messageHeader}>
              <span className={styles.messageRole}>
                {message.role === 'user' ? 'You' : 'AI'}
              </span>
              <button
                className={styles.unpinButton}
                onClick={() => handleUnpin(message.id)}
                aria-label="Unpin message"
                title="Unpin message"
              >
                <span className={styles.unpinIcon}>📌</span>
              </button>
            </div>
            <div className={styles.messageContent}>
              {message.content.length > 100 
                ? `${message.content.substring(0, 100)}...` 
                : message.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

// Add display name for React DevTools
PinnedMessages.displayName = 'PinnedMessages';

export default PinnedMessages; 