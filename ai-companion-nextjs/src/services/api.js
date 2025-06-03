const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Makes API requests to the backend server
 */
const api = {
  /**
   * Verifies a user with Clerk ID
   * @param {string} clerkId - The Clerk user ID
   * @returns {Promise<Object>} - Response with user data
   */
  verifyUser: async (clerkId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/verify-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clerkId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to verify user');
      }

      return await response.json();
    } catch (error) {
      console.error('Error verifying user:', error);
      throw error;
    }
  },

  /**
   * Updates a user profile
   * @param {string} clerkId - The Clerk user ID
   * @param {Object} profileData - The profile data to update
   * @returns {Promise<Object>} - Response with updated user data
   */
  updateUserProfile: async (clerkId, profileData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/users/${clerkId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user profile');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  },

  /**
   * Creates a new AI character
   * @param {string} clerkId - The Clerk user ID
   * @param {Object} characterData - The character data (name, interests, age, description)
   * @returns {Promise<Object>} - Response with created character data
   */
  createCharacter: async (clerkId, characterData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/character`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerkId,
          ...characterData
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create character');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating character:', error);
      throw error;
    }
  },

  /**
   * Uploads an image for a character
   * @param {string} characterId - The character ID
   * @param {string} clerkId - The Clerk user ID
   * @param {string} imageData - Base64 encoded image data
   * @returns {Promise<Object>} - Response with updated character data
   */
  uploadCharacterImage: async (characterId, clerkId, imageData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/character/${characterId}/image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerkId,
          imageData
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload character image');
      }

      return await response.json();
    } catch (error) {
      console.error('Error uploading character image:', error);
      throw error;
    }
  },

  /**
   * Gets all characters for a user
   * @param {string} clerkId - The Clerk user ID
   * @returns {Promise<Object>} - Response with characters data
   */
  getUserCharacters: async (clerkId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/characters/${clerkId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get characters');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting user characters:', error);
      throw error;
    }
  },

  /**
   * Creates a new conversation with a character
   * @param {string} clerkId - The Clerk user ID
   * @param {string} characterId - The character ID
   * @param {string} title - Optional conversation title
   * @returns {Promise<Object>} - Response with created conversation data
   */
  createConversation: async (clerkId, characterId, title = null) => {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerkId,
          characterId,
          title
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create conversation');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  },

  /**
   * Gets all conversations for a user
   * @param {string} clerkId - The Clerk user ID
   * @param {string} characterId - Optional character ID to filter by
   * @returns {Promise<Object>} - Response with conversations data
   */
  getUserConversations: async (clerkId, characterId = null) => {
    try {
      let url = `${API_BASE_URL}/v1/conversations/${clerkId}`;
      if (characterId) {
        url += `?characterId=${characterId}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get conversations');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting user conversations:', error);
      throw error;
    }
  },

  /**
   * Gets a single conversation with messages
   * @param {string} clerkId - The Clerk user ID
   * @param {string} conversationId - The conversation ID
   * @returns {Promise<Object>} - Response with conversation and character data
   */
  getConversation: async (clerkId, conversationId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/conversations/${clerkId}/${conversationId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get conversation');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting conversation:', error);
      throw error;
    }
  },

  /**
   * Sends a message in a conversation
   * @param {string} conversationId - The conversation ID
   * @param {string} clerkId - The Clerk user ID
   * @param {string} message - The message content
   * @returns {Promise<Object>} - Response with AI message data
   */
  sendMessage: async (conversationId, clerkId, message) => {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerkId,
          message
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  /**
   * Regenerates the AI response for the last message
   * @param {string} conversationId - The conversation ID
   * @param {string} clerkId - The Clerk user ID
   * @returns {Promise<Object>} - Response with regenerated AI message data
   */
  regenerateMessage: async (conversationId, clerkId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/conversations/${conversationId}/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerkId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to regenerate message');
      }

      return await response.json();
    } catch (error) {
      console.error('Error regenerating message:', error);
      throw error;
    }
  },

  /**
   * Edits a message in a conversation
   * @param {string} conversationId - The conversation ID
   * @param {string} messageId - The message ID
   * @param {string} clerkId - The Clerk user ID
   * @param {string} content - The new message content
   * @returns {Promise<Object>} - Response with edited message data
   */
  editMessage: async (conversationId, messageId, clerkId, content) => {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/conversations/${conversationId}/messages/${messageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerkId,
          content
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to edit message');
      }

      return await response.json();
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  },

  /**
   * Deletes a message from a conversation
   * @param {string} conversationId - The conversation ID
   * @param {string} messageId - The message ID
   * @param {string} clerkId - The Clerk user ID
   * @returns {Promise<Object>} - Response with deleted message ID
   */
  deleteMessage: async (conversationId, messageId, clerkId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/conversations/${conversationId}/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerkId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete message');
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  },

  /**
   * Clears all messages in a conversation
   * @param {string} conversationId - The conversation ID
   * @param {string} clerkId - The Clerk user ID
   * @returns {Promise<Object>} - Response with conversation ID
   */
  clearConversation: async (conversationId, clerkId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/conversations/${conversationId}/clear`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerkId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clear conversation');
      }

      return await response.json();
    } catch (error) {
      console.error('Error clearing conversation:', error);
      throw error;
    }
  },

  /**
   * Deletes a conversation
   * @param {string} conversationId - The conversation ID
   * @param {string} clerkId - The Clerk user ID
   * @returns {Promise<Object>} - Response with deleted conversation ID
   */
  deleteConversation: async (conversationId, clerkId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerkId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete conversation');
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  },

  /**
   * Updates a conversation title
   * @param {string} conversationId - The conversation ID
   * @param {string} clerkId - The Clerk user ID
   * @param {string} title - The new conversation title
   * @returns {Promise<Object>} - Response with updated conversation data
   */
  updateConversationTitle: async (conversationId, clerkId, title) => {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/conversations/${conversationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerkId,
          title
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update conversation title');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating conversation title:', error);
      throw error;
    }
  },

  /**
   * Deletes a character
   * @param {string} characterId - The character ID
   * @param {string} clerkId - The Clerk user ID
   * @returns {Promise<Object>} - Response with deleted character ID
   */
  deleteCharacter: async (characterId, clerkId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/character/${characterId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerkId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete character');
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting character:', error);
      throw error;
    }
  },

  /**
   * Updates a character
   * @param {string} characterId - The character ID
   * @param {string} clerkId - The Clerk user ID
   * @param {Object} characterData - The character data to update
   * @returns {Promise<Object>} - Response with updated character data
   */
  updateCharacter: async (characterId, clerkId, characterData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/character/${characterId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerkId,
          ...characterData
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update character');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating character:', error);
      throw error;
    }
  },
  
  /**
   * Gets user limits and usage
   * @param {string} clerkId - The Clerk user ID
   * @returns {Promise<Object>} - Response with limits data
   */
  getUserLimits: async (clerkId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/users/${clerkId}/limits`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get user limits');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting user limits:', error);
      throw error;
    }
  }
};

export default api; 