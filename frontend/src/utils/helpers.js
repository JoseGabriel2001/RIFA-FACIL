/**
 * @fileoverview Utility helper functions for RifaFacil frontend
 * 
 * This module contains reusable utility functions used across
 * multiple components. Centralizing these functions:
 * - Reduces code duplication
 * - Ensures consistent behavior
 * - Makes testing easier
 */

// =============================================================================
// CLIPBOARD UTILITIES
// =============================================================================

/**
 * Copy text to clipboard with fallback support.
 * 
 * Uses the modern Clipboard API when available, with a fallback
 * to the legacy execCommand('copy') method for older browsers
 * and restricted environments (iframes, certain mobile browsers).
 * 
 * Why the fallback is needed:
 * - Some browsers block Clipboard API in iframes (for security)
 * - Older browsers don't support the Clipboard API
 * - Some mobile browsers have partial support
 * 
 * @param {string} text - Text to copy to clipboard
 * @returns {Promise<boolean>} True if copy succeeded, false otherwise
 * 
 * @example
 * const success = await copyToClipboard('https://example.com/raffle/ABC123');
 * if (success) {
 *   showToast('Link copied!');
 * } else {
 *   showToast('Could not copy. Here is the link: ...');
 * }
 */
export const copyToClipboard = async (text) => {
  // Strategy 1: Modern Clipboard API (preferred)
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      // Clipboard API failed (might be blocked in iframe)
      console.log('Clipboard API failed, trying fallback:', error.message);
    }
  }

  // Strategy 2: Legacy execCommand fallback
  // This creates a temporary textarea, selects its content, and copies
  return copyToClipboardFallback(text);
};

/**
 * Fallback copy method using execCommand.
 * 
 * Creates a temporary textarea element, selects its content,
 * and uses the deprecated execCommand('copy') to copy.
 * 
 * @private
 * @param {string} text - Text to copy
 * @returns {boolean} True if successful
 */
const copyToClipboardFallback = (text) => {
  try {
    // Create a hidden textarea
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Make it invisible but keep it in the document flow
    // position: fixed prevents scrolling issues
    Object.assign(textArea.style, {
      top: '0',
      left: '0',
      position: 'fixed',
      opacity: '0',
      pointerEvents: 'none',
      // Ensure it's not zero-sized (some browsers ignore it)
      width: '2em',
      height: '2em',
    });
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    // Execute the copy command
    const successful = document.execCommand('copy');
    
    // Clean up
    document.body.removeChild(textArea);
    
    return successful;
  } catch (error) {
    console.log('Fallback copy failed:', error.message);
    return false;
  }
};

// =============================================================================
// FORMATTING UTILITIES
// =============================================================================

/**
 * Format a number as currency.
 * 
 * Uses Intl.NumberFormat for locale-aware formatting.
 * Default is Mexican Pesos (MXN) with Spanish (Mexico) locale.
 * 
 * @param {number} amount - Amount to format
 * @param {string} [currency='MXN'] - ISO 4217 currency code
 * @param {string} [locale='es-MX'] - BCP 47 locale string
 * @returns {string} Formatted currency string (e.g., "$1,234.56 MXN")
 * 
 * @example
 * formatCurrency(1234.56) // "$1,234.56"
 * formatCurrency(100, 'USD', 'en-US') // "$100.00"
 */
export const formatCurrency = (amount, currency = 'MXN', locale = 'es-MX') => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format a date string for display.
 * 
 * Uses Intl.DateTimeFormat for locale-aware formatting.
 * Default is Spanish (Mexico) with day, abbreviated month, and year.
 * 
 * @param {string|Date} dateString - ISO date string or Date object
 * @param {Intl.DateTimeFormatOptions} [options] - Override format options
 * @returns {string} Formatted date string (e.g., "25 dic 2024")
 * 
 * @example
 * formatDate('2024-12-25') // "25 dic 2024"
 * formatDate('2024-12-25', { weekday: 'long' }) // "miércoles, 25 dic 2024"
 */
export const formatDate = (dateString, options = {}) => {
  const defaultOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };
  
  const mergedOptions = { ...defaultOptions, ...options };
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', mergedOptions);
  } catch (error) {
    console.error('Error formatting date:', error);
    return String(dateString);
  }
};

/**
 * Format a date for datetime-local input.
 * 
 * Converts a Date or ISO string to the format required by
 * HTML datetime-local inputs: YYYY-MM-DDTHH:MM
 * 
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted datetime string for input value
 * 
 * @example
 * formatDateForInput(new Date()) // "2024-12-20T15:30"
 */
export const formatDateForInput = (date) => {
  const d = new Date(date);
  
  // Format: YYYY-MM-DDTHH:MM
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// =============================================================================
// STRING UTILITIES
// =============================================================================

/**
 * Truncate a string to a maximum length with ellipsis.
 * 
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length including ellipsis
 * @returns {string} Truncated text with "..." if needed
 * 
 * @example
 * truncate('Hello World', 8) // "Hello..."
 * truncate('Hi', 10) // "Hi"
 */
export const truncate = (text, maxLength) => {
  if (!text || text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Format a list of ticket numbers for display.
 * 
 * Sorts numbers and joins with hash prefix.
 * 
 * @param {number[]} tickets - Array of ticket numbers
 * @returns {string} Formatted string (e.g., "#1, #5, #12")
 * 
 * @example
 * formatTicketList([12, 1, 5]) // "#1, #5, #12"
 */
export const formatTicketList = (tickets) => {
  if (!tickets || tickets.length === 0) return '';
  return tickets
    .slice()
    .sort((a, b) => a - b)
    .map(n => `#${n}`)
    .join(', ');
};

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Validate an email address format.
 * 
 * Uses a simple regex that catches most invalid emails without
 * being overly strict (allows most valid emails through).
 * 
 * @param {string} email - Email to validate
 * @returns {boolean} True if email format is valid
 */
export const isValidEmail = (email) => {
  if (!email) return false;
  // Simple regex: something@something.something
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Check if a password meets minimum requirements.
 * 
 * Current requirements:
 * - At least 6 characters
 * 
 * @param {string} password - Password to validate
 * @returns {boolean} True if password is valid
 */
export const isValidPassword = (password) => {
  return password && password.length >= 6;
};

// =============================================================================
// NUMBER UTILITIES
// =============================================================================

/**
 * Clamp a number between min and max values.
 * 
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 * 
 * @example
 * clamp(15, 0, 10) // 10
 * clamp(-5, 0, 10) // 0
 * clamp(5, 0, 10) // 5
 */
export const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Generate a random integer between min and max (inclusive).
 * 
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @returns {number} Random integer
 */
export const randomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};
