/**
 * @fileoverview API configuration and constants
 * 
 * Centralizes API endpoint definitions and configuration to ensure
 * consistency across the application and make endpoint changes easier.
 */

/**
 * Base backend URL from environment variables
 * In production, this points to the deployed backend service
 */
export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

/**
 * API base path - all backend routes are prefixed with /api
 * This is handled by the Kubernetes ingress configuration
 */
export const API_BASE = `${BACKEND_URL}/api`;

/**
 * API endpoint definitions organized by resource
 * Using constants prevents typos and makes refactoring easier
 */
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    REGISTER: `${API_BASE}/auth/register`,
    LOGIN: `${API_BASE}/auth/login`,
    ME: `${API_BASE}/auth/me`,
    GOOGLE_SESSION: `${API_BASE}/auth/google/session`,
    LOGOUT: `${API_BASE}/auth/logout`,
  },
  
  // Raffles
  RAFFLES: {
    BASE: `${API_BASE}/raffles`,
    BY_ID: (id: string) => `${API_BASE}/raffles/${id}`,
    PRESELECT_WINNER: (id: string) => `${API_BASE}/raffles/${id}/preselect-winner`,
    SPIN: (id: string) => `${API_BASE}/raffles/${id}/spin`,
    RESET_SPINS: (id: string) => `${API_BASE}/raffles/${id}/reset-spins`,
    SET_WINNER: (id: string) => `${API_BASE}/raffles/${id}/set-winner`,
    RANDOM_WINNER: (id: string) => `${API_BASE}/raffles/${id}/random-winner`,
    ASSIGN_TICKETS: (id: string) => `${API_BASE}/raffles/${id}/assign-tickets`,
    CASH_ORDERS: (id: string) => `${API_BASE}/raffles/${id}/cash-orders`,
    VALIDATE_ORDER: (id: string) => `${API_BASE}/raffles/${id}/validate-order`,
  },
  
  // Public (no auth required)
  PUBLIC: {
    RAFFLE: (shareCode: string) => `${API_BASE}/public/raffle/${shareCode}`,
  },
  
  // Payments
  PAYMENTS: {
    MERCADOPAGO: {
      CREATE_PREFERENCE: `${API_BASE}/payments/mercadopago/create-preference`,
      STATUS: (txnId: string) => `${API_BASE}/payments/mercadopago/status/${txnId}`,
      VERIFY: (txnId: string) => `${API_BASE}/payments/mercadopago/verify/${txnId}`,
    },
    STRIPE: {
      CHECKOUT: `${API_BASE}/payments/stripe/checkout`,
      STATUS: (sessionId: string) => `${API_BASE}/payments/stripe/status/${sessionId}`,
    },
    PAYPAL: {
      CREATE_ORDER: `${API_BASE}/payments/paypal/create-order`,
      CAPTURE: (orderId: string) => `${API_BASE}/payments/paypal/capture-order/${orderId}`,
    },
    CASH: {
      CREATE_ORDER: `${API_BASE}/payments/cash/create-order`,
    },
  },
  
  // User
  USER: {
    MY_TICKETS: `${API_BASE}/my-tickets`,
    STATS: `${API_BASE}/stats`,
    UPGRADE_PLAN: `${API_BASE}/upgrade-plan`,
  },
  
  // Uploads
  UPLOADS: {
    IMAGE: `${API_BASE}/upload-image`,
    GET_IMAGE: (filename: string) => `${API_BASE}/images/${filename}`,
  },
} as const;

/**
 * HTTP status codes used in the application
 * Named constants improve readability over magic numbers
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Local storage keys used throughout the application
 * Centralizing these prevents key collision and makes debugging easier
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'token',
  USER_PREFERENCES: 'user_preferences',
} as const;

/**
 * Application-wide constants
 */
export const APP_CONSTANTS = {
  /** Maximum tickets allowed per raffle */
  MAX_TICKETS_PER_RAFFLE: 1000,
  /** Maximum file size for image uploads (5MB) */
  MAX_IMAGE_SIZE_BYTES: 5 * 1024 * 1024,
  /** Allowed image extensions for uploads */
  ALLOWED_IMAGE_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  /** Hours before cash order expires */
  CASH_ORDER_EXPIRY_HOURS: 48,
  /** Maximum number of wheel spins before winner reveal */
  MAX_WHEEL_SPINS: 10,
  /** Default number of wheel spins */
  DEFAULT_WHEEL_SPINS: 3,
  /** Maximum active raffles for free plan */
  FREE_PLAN_MAX_RAFFLES: 2,
} as const;

/**
 * External service configuration
 */
export const EXTERNAL_SERVICES = {
  /** Google OAuth URL (Emergent Auth) */
  GOOGLE_AUTH_URL: 'https://demobackend.emergentagent.com/auth/v1/env/oauth/google',
  /** PayPal Client ID (from env) */
  PAYPAL_CLIENT_ID: process.env.REACT_APP_PAYPAL_CLIENT_ID || '',
  /** MercadoPago Public Key (from env) */
  MERCADOPAGO_PUBLIC_KEY: process.env.REACT_APP_MERCADOPAGO_PUBLIC_KEY || '',
} as const;
