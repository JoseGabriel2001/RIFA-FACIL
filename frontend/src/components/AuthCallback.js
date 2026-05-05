/**
 * @fileoverview Google OAuth Callback Handler
 * 
 * This component handles the redirect from Google OAuth authentication.
 * It listens for Google auth success/error events and manages the login flow.
 * 
 * OAuth Flow:
 * 1. User clicks "Login with Google" button
 * 2. GoogleSignInButton handles OAuth with Google
 * 3. Dispatches googleAuthSuccess event with token and user data
 * 4. This component captures event and logs in the user
 * 5. User is redirected to dashboard
 * 
 * No URL redirect needed - everything handled via events.
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';



/**
 * AuthCallback Component
 * 
 * Listens for Google OAuth success/error events and handles login.
 * 
 * @returns {JSX.Element} Loading spinner while processing
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    /**
     * Handle successful Google authentication event.
     */
    const handleGoogleSuccess = (event) => {
      if (hasProcessed.current) return;
      hasProcessed.current = true;

      const { token, user } = event.detail;
      try {
        // Log in the user with received token and data
        login(token, user);

        // Redirect to dashboard
        navigate('/dashboard', {
          replace: true,
          state: { user }
        });
      } catch (error) {
        console.error('Login failed:', error);
        redirectToLogin();
      }
    };

    /**
     * Handle Google authentication errors.
     */
    const handleGoogleError = (event) => {
      console.error('Google auth error:', event.detail);
      redirectToLogin();
    };

    window.addEventListener('googleAuthSuccess', handleGoogleSuccess);
    window.addEventListener('googleAuthError', handleGoogleError);

    return () => {
      window.removeEventListener('googleAuthSuccess', handleGoogleSuccess);
      window.removeEventListener('googleAuthError', handleGoogleError);
    };
  }, [navigate, login]);

  /**\n   * Redirect to login page with error indication.\n   * Using replace to prevent back button from returning here.\n   */ const redirectToLogin = () => {
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
