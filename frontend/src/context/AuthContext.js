/**
 * @fileoverview Authentication Context for RifaFacil
 * 
 * This module provides authentication state management across the application.
 * It handles both traditional email/password authentication and Google OAuth.
 * 
 * Architecture:
 * - Uses React Context API for global state
 * - JWT tokens are stored in localStorage for persistence
 * - User data is fetched on mount if a token exists
 * 
 * Security Considerations:
 * - Tokens expire after 24 hours (set by backend)
 * - Invalid/expired tokens trigger automatic logout
 * - Token is included in Authorization header for all authenticated requests
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// API configuration from environment
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Local storage key for JWT token
const TOKEN_STORAGE_KEY = 'token';

/**
 * @typedef {Object} User
 * @property {string} id - Unique user identifier (UUID)
 * @property {string} email - User's email address
 * @property {string} name - Display name
 * @property {('free'|'premium')} plan - Subscription plan level
 * @property {boolean} is_super_admin - Whether user has admin privileges
 * @property {string} [picture] - Profile picture URL (from Google OAuth)
 */

/**
 * @typedef {Object} AuthContextValue
 * @property {User|null} user - Current authenticated user or null
 * @property {string|null} token - JWT authentication token
 * @property {boolean} loading - Whether auth state is being determined
 * @property {function} login - Login with email/password or direct token
 * @property {function} register - Register a new user account
 * @property {function} logout - Clear authentication state
 * @property {function} updateUser - Update user data in context
 */

/**
 * Authentication Context
 * @type {React.Context<AuthContextValue|null>}
 */
const AuthContext = createContext(null);

/**
 * Custom hook to access authentication context.
 * 
 * Must be used within an AuthProvider component.
 * Throws an error if used outside the provider for early bug detection.
 * 
 * @returns {AuthContextValue} Authentication context value
 * @throws {Error} When used outside of AuthProvider
 * 
 * @example
 * function ProfilePage() {
 *   const { user, logout } = useAuth();
 *   return <button onClick={logout}>Logout {user.name}</button>;
 * }
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Authentication Provider Component
 * 
 * Wraps the application to provide authentication state to all children.
 * On mount, it checks for an existing token and validates it with the server.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Provider component
 */
export const AuthProvider = ({ children }) => {
  /** @type {[User|null, function]} Current user state */
  const [user, setUser] = useState(null);
  
  /** @type {[string|null, function]} JWT token state */
  const [token, setToken] = useState(localStorage.getItem(TOKEN_STORAGE_KEY));
  
  /** @type {[boolean, function]} Loading state during initial auth check */
  const [loading, setLoading] = useState(true);

  /**
   * Effect: Validate existing token on mount
   * 
   * If a token exists in localStorage, we verify it's still valid by
   * fetching the current user from the API. Invalid tokens trigger logout.
   */
  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  /**
   * Fetch current user data from the API.
   * 
   * Uses the stored JWT token to authenticate.
   * On failure (expired/invalid token), triggers logout.
   * 
   * @returns {Promise<void>}
   */
  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      // Token is invalid or expired - clear auth state
      console.error('Error fetching user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  /**
   * Authenticate a user.
   * 
   * This function supports two authentication modes:
   * 
   * 1. Email/Password Login:
   *    Called with (email, password) strings
   *    Makes API call to /auth/login
   * 
   * 2. Direct Token Login (OAuth):
   *    Called with (token, user) where user is an object
   *    Used by Google OAuth callback to set auth state directly
   * 
   * @param {string} emailOrToken - Email address OR JWT token
   * @param {string|User} passwordOrUser - Password string OR User object
   * @returns {Promise<User>} Authenticated user data
   * @throws {Error} On authentication failure
   * 
   * @example
   * // Email/password login
   * await login('user@example.com', 'password123');
   * 
   * @example
   * // Direct token login (from OAuth callback)
   * await login(jwtToken, { id: '...', email: '...', name: '...' });
   */
  const login = async (emailOrToken, passwordOrUser) => {
    // Detect OAuth callback mode: second argument is an object (user data)
    const isDirectTokenLogin = typeof passwordOrUser === 'object' && passwordOrUser !== null;
    
    if (isDirectTokenLogin) {
      // OAuth flow: token and user data provided directly
      const newToken = emailOrToken;
      const userData = passwordOrUser;
      
      // Persist token and update state
      localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
      setToken(newToken);
      setUser(userData);
      
      return userData;
    }
    
    // Standard email/password flow
    const response = await axios.post(`${API}/auth/login`, { 
      email: emailOrToken, 
      password: passwordOrUser 
    });
    
    const { token: newToken, user: userData } = response.data;
    
    // Persist token and update state
    localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    setToken(newToken);
    setUser(userData);
    
    return userData;
  };

  /**
   * Register a new user account.
   * 
   * Creates a new account and automatically logs in the user.
   * New users start on the 'free' plan with 2 raffle limit.
   * 
   * @param {string} name - User's display name
   * @param {string} email - Email address (must be unique)
   * @param {string} password - Password (min 6 characters)
   * @returns {Promise<User>} Newly created user data
   * @throws {Error} If email is already registered or validation fails
   * 
   * @example
   * try {
   *   await register('John Doe', 'john@example.com', 'secure123');
   *   // User is now logged in
   * } catch (error) {
   *   // Handle registration error
   * }
   */
  const register = async (name, email, password) => {
    const response = await axios.post(`${API}/auth/register`, { 
      name, 
      email, 
      password 
    });
    
    const { token: newToken, user: userData } = response.data;
    
    // Auto-login after registration
    localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    setToken(newToken);
    setUser(userData);
    
    return userData;
  };

  /**
   * Clear authentication state.
   * 
   * Removes token from localStorage and resets context state.
   * Use for explicit logout or when token is invalid.
   * 
   * Note: Does not make API call - backend handles token expiration
   */
  const logout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  };

  /**
   * Update user data in context.
   * 
   * Used when user data changes (e.g., plan upgrade) without
   * requiring re-authentication.
   * 
   * @param {User} userData - Updated user data
   */
  const updateUser = (userData) => {
    setUser(userData);
  };

  // Context value object - memoization handled by React
  const contextValue = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateUser
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
