/**
 * @fileoverview Google Sign-In Button Component
 * 
 * A reusable button component for initiating Google OAuth authentication.
 * Uses Google's official React OAuth library for secure sign-in.
 * 
 * OAuth Flow:
 * 1. User clicks this button
 * 2. Google OAuth popup/redirect appears
 * 3. User authenticates with Google
 * 4. Returns ID token to frontend
 * 5. Frontend sends ID token to backend for validation
 * 6. Backend validates token with Google and creates/updates user
 */

import React, { useCallback } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';

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
 * GoogleSignInButton Component
 * 
 * Renders a button that initiates Google OAuth authentication.
 * Uses Google's official OAuth library for secure authentication.
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
  const [isLoading, setIsLoading] = React.useState(false);

  /**
   * Handle successful Google authentication.
   * Exchanges the authorization code for tokens at the backend.
   */
  const handleGoogleSuccess = useCallback(async (response) => {
    try {
      setIsLoading(true);

      // Get the access token from Google
      const { access_token } = response;

      // Send to backend for validation and user creation
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
      const authResponse = await fetch(`${backendUrl}/api/auth/google/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ access_token }),
      });

      if (!authResponse.ok) {
        throw new Error('Failed to authenticate with Google');
      }

      const authData = await authResponse.json();
      localStorage.setItem('token', authData.token);
      localStorage.setItem('user', JSON.stringify(authData.user));
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Google auth error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => {
      console.error('Google login failed');
      window.dispatchEvent(new CustomEvent('googleAuthError', { detail: { error: 'Google login failed' } }));
    },
    flow: 'implicit',
  });

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full flex items-center justify-center gap-3 py-6 border-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-50"
      onClick={() => login()}
      disabled={isLoading}
      data-testid="google-signin-btn"
      aria-label={getButtonText(mode)}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <GoogleIcon />
      )}
      <span className="text-slate-700 font-medium">
        {isLoading ? 'Cargando...' : getButtonText(mode)}
      </span>
    </Button>
  );
};

export default GoogleSignInButton;
