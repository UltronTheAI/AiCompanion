/**
 * Validates if a string or object is a valid MongoDB ObjectId
 * @param {string|object} id - The ID to validate (can be string or {$oid: string})
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidObjectId = (id) => {
  // Handle regular string ObjectId
  if (typeof id === 'string') {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }
  
  // Handle MongoDB extended JSON format: {$oid: "..."}
  if (id && typeof id === 'object' && id.$oid && typeof id.$oid === 'string') {
    return /^[0-9a-fA-F]{24}$/.test(id.$oid);
  }
  
  return false;
};

/**
 * Gets the string value of an ObjectId regardless of format
 * @param {string|object} id - The ID (can be string or {$oid: string})
 * @returns {string|null} - The string value or null if invalid
 */
export const getObjectIdString = (id) => {
  if (typeof id === 'string') {
    return /^[0-9a-fA-F]{24}$/.test(id) ? id : null;
  }
  
  if (id && typeof id === 'object' && id.$oid && typeof id.$oid === 'string') {
    return /^[0-9a-fA-F]{24}$/.test(id.$oid) ? id.$oid : null;
  }
  
  return null;
};

/**
 * Validates if an object has a valid MongoDB ObjectId as _id property
 * @param {Object} obj - The object to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const hasValidObjectId = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  
  return isValidObjectId(obj._id);
}; 