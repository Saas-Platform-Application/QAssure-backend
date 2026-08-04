/**
 * Date Formatter Utility
 * Provides consistent date and time formatting across the application
 */

/**
 * Format a date object or string into dd-mm-yyyy HH:mm:ss AM/PM format (Asia/Kolkata)
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
const formatDateTime = (date) => {
  if (!date) return '';
  
  try {
    const d = new Date(date);
    // Use Intl.DateTimeFormat for robust timezone-aware formatting
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    }).format(d).replace(/\//g, '-');
  } catch (error) {
    console.error('[DateFormatter] Formatting error:', error.message);
    return date.toString();
  }
};

/**
 * Format a date object into dd-mm-yyyy format (Asia/Kolkata)
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
const formatDate = (date) => {
  if (!date) return '';
  
  try {
    const d = new Date(date);
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Asia/Kolkata'
    }).format(d).replace(/\//g, '-');
  } catch (error) {
    console.error('[DateFormatter] Formatting error:', error.message);
    return date.toString();
  }
};

module.exports = {
  formatDateTime,
  formatDate
};
