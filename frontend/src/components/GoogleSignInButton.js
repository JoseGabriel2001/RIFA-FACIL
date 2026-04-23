/**
 * @fileoverview Google Sign-In Button Component
 * 
 * A reusable button component for initiating Google OAuth authentication.
 * Uses Emergent Auth's OAuth endpoint for Google sign-in.
 * 
 * OAuth Flow:
 * 1. User clicks this button
 * 2. Redirected to Emergent Auth's Google OAuth URL
 * 3. User authenticates with Google
 * 4. Redirected back to current page with session_id in hash
 * 5. AuthCallback component handles the session exchange
 * 
 * IMPORTANT: Do not hardcode redirect URLs or add fallbacks!
 * The redirect URL must be the current page for the OAuth flow to work.
 */

import React from 'react';
import { Button } from './ui/button';

/** Emergent Auth's Google OAuth endpoint */
const GOOGLE_AUTH_BASE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '446691362197-un1iq05n3sebs0v0aigbg3spgejl5td1.apps.googleusercontent.com';
console.log('Google Client ID:', process.env); // Debug log to verify client ID is loaded
const GOOGLE_SCOPE = 'openid email profile';
const GOOGLE_RESPONSE_TYPE = 'code'; // o "token" si usas flujo implícito

/**
 * @typedef {Object} GoogleSignInButtonProps
 * @property {('login'|'register')} [mode='login'] - Display mode for button text
 */

/**
 * Google OAuth Icon SVG
 * 
 * Uses Google's official brand colors for each letter/section.
 * Extracted as a separate component for cleaner code.
 * 
 * @returns {JSX.Element} Google logo SVG
 */
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
    {/* Blue: Google "G" right side */}
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    {/* Green: Google "G" bottom */}
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    {/* Yellow: Google "G" left bottom */}
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    {/* Red: Google "G" top */}
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

/**
 * Get the button text based on mode.
 * 
 * @param {string} mode - 'login' or 'register'
 * @returns {string} Localized button text
 */
const getButtonText = (mode) => {
  return mode === 'login' 
    ? 'Continuar con Google' 
    : 'Registrarse con Google';
};

/**
 * Build the Google OAuth URL with redirect parameter.
 * 
 * The redirect_url is set to the current page (origin + pathname)
 * without the hash fragment. After authentication, Google redirects
 * back to this URL with the session_id in the hash.
 * 
 * @returns {string} Complete OAuth URL
 */
const buildGoogleAuthUrl = () => {
  // Use current page as redirect target (without any hash)
  const redirectUrl = window.location.origin + window.location.pathname;
  // Build the complete OAuth URL with encoded redirect
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUrl,
    response_type: GOOGLE_RESPONSE_TYPE,
    scope: GOOGLE_SCOPE,
    prompt: 'select_account',
    access_type: 'online',
  });

  return `${GOOGLE_AUTH_BASE_URL}?${params.toString()}`;
};

/**
 * GoogleSignInButton Component
 * 
 * Renders a button that initiates Google OAuth authentication.
 * Styled to match Google's brand guidelines while fitting the app's design.
 * 
 * @param {GoogleSignInButtonProps} props - Component props
 * @returns {JSX.Element} Rendered button
 * 
 * @example
 * // On login page
 * <GoogleSignInButton mode="login" />
 * 
 * @example
 * // On registration page
 * <GoogleSignInButton mode="register" />
 */
const GoogleSignInButton = ({ mode = 'login' }) => {
  /**
   * Handle button click.
   * Redirects the browser to Google's OAuth flow.
   */
  const handleGoogleSignIn = () => {
    const authUrl = buildGoogleAuthUrl();
    window.location.href = authUrl;
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full flex items-center justify-center gap-3 py-6 border-slate-300 hover:bg-slate-50 transition-colors"
      onClick={handleGoogleSignIn}
      data-testid="google-signin-btn"
      aria-label={getButtonText(mode)}
    >
      <GoogleIcon />
      <span className="text-slate-700 font-medium">
        {getButtonText(mode)}
      </span>
    </Button>
  );
};

export default GoogleSignInButton;
