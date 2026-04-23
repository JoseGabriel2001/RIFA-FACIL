/**
 * @fileoverview Google OAuth Callback Handler
 * 
 * This component handles the redirect from Google OAuth authentication.
 * It extracts the session_id from the URL fragment and exchanges it
 * for a JWT token and user data.
 * 
 * OAuth Flow:
 * 1. User clicks "Login with Google" button
 * 2. Redirected to Google for authentication
 * 3. Google redirects back with session_id in URL fragment
 * 4. This component extracts session_id and calls backend
 * 5. Backend validates with Emergent Auth and returns JWT + user
 * 6. User is logged in and redirected to dashboard
 * 
 * Security Note:
 * The session_id is passed in the URL fragment (#) rather than query
 * string (?) to prevent it from being logged in server access logs.
 * 
 * IMPORTANT: Do not hardcode URLs or add fallbacks - this breaks auth!
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

/** API base URL from environment */
const API = process.env.REACT_APP_BACKEND_URL + '/api';

/**
 * Extract session_id from URL hash fragment.
 * 
 * The hash format is: #session_id=abc123&other=params
 * 
 * @param {string} hash - URL hash string (including #)
 * @returns {string|null} Session ID or null if not found
 */
const extractSessionIdFromHash = (hash) => {
  if (!hash || !hash.includes('session_id=')) {
    return null;
  }
  
  // Remove leading # and parse as URLSearchParams
  const params = new URLSearchParams(hash.substring(1));
  return params.get('session_id');
};

/**
 * AuthCallback Component
 * 
 * Handles the OAuth callback by:
 * 1. Extracting session_id from URL hash
 * 2. Exchanging it for authentication tokens
 * 3. Logging in the user
 * 4. Redirecting to the dashboard
 * 
 * If anything fails, redirects to login page.
 * 
 * @returns {JSX.Element} Loading spinner while processing
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  /**
   * Ref to prevent double processing in React StrictMode.
   * StrictMode runs effects twice in development, which would
   * cause duplicate API calls. This ref ensures we only process once.
   */
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Guard against double execution
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    processOAuthCallback();
  }, [navigate, login]);

  /**
   * Process the OAuth callback.
   * 
   * This is the main logic for handling the Google OAuth redirect.
   * It's extracted as a named function for better readability and
   * error handling.
   */
  const processOAuthCallback = async () => {
    try {
      // Step 1: Extract session_id from URL
      const sessionId = extractSessionIdFromHash(window.location.hash);

      if (!sessionId) {
        console.error('No session_id found in URL hash');
        redirectToLogin();
        return;
      }

      // Step 2: Exchange session_id for auth tokens
      const authData = await exchangeSessionForTokens(sessionId);
      
      if (!authData) {
        redirectToLogin();
        return;
      }

      // Step 3: Log in the user using AuthContext
      // The login function accepts (token, user) for direct OAuth login
      login(authData.token, authData.user);
      
      // Step 4: Clean up URL and redirect
      // Remove the hash from URL to prevent re-processing
      window.history.replaceState(null, '', window.location.pathname);
      
      // Navigate to dashboard with user data
      navigate('/dashboard', { 
        replace: true, 
        state: { user: authData.user } 
      });
      
    } catch (error) {
      console.error('Auth callback error:', error);
      redirectToLogin();
    }
  };

  /**
   * Exchange OAuth session_id for authentication tokens.
   * 
   * Makes a POST request to the backend to validate the session
   * with Emergent Auth and get JWT + user data.
   * 
   * @param {string} sessionId - Session ID from OAuth redirect
   * @returns {Promise<{token: string, user: Object}|null>} Auth data or null on failure
   */
  const exchangeSessionForTokens = async (sessionId) => {
    try {
      const response = await fetch(`${API}/auth/google/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for session management
        body: JSON.stringify({ session_id: sessionId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Session exchange failed:', response.status, errorText);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to exchange session:', error);
      return null;
    }
  };

  /**
   * Redirect to login page with error indication.
   * Using replace to prevent back button from returning here.
   */
  const redirectToLogin = () => {
    navigate('/login', { replace: true });
  };

  // Render loading state while processing
  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-slate-50"
      data-testid="auth-callback-loading"
    >
      <div className="text-center">
        <Loader2 
          className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" 
          aria-hidden="true"
        />
        <p className="text-slate-600">
          Iniciando sesión con Google...
        </p>
        <p className="text-slate-400 text-sm mt-2">
          Por favor espera un momento
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;
