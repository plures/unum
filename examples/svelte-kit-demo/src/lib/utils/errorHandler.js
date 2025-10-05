/**
 * Navigate to the error page with specified error details
 * @param {string} message - Error message to display
 * @param {number} status - HTTP status code
 */
export function navigateToErrorPage(message, status = 500) {
  const params = new URLSearchParams();
  params.set('message', message);
  params.set('status', status.toString());
  
  // Navigate to the error page with parameters
  window.location.href = `/error?${params.toString()}`;
}

/**
 * Set error details directly if on the error page
 * @param {object} error - Error object with message
 * @param {number} status - HTTP status code
 */
export function setErrorDetails(error, status = 500) {
  if (window.setErrorDetails) {
    window.setErrorDetails(error, status);
  } else {
    // If not on error page, navigate there
    navigateToErrorPage(error.message || 'Unknown error', status);
  }
} 