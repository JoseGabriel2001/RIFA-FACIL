/**
 * @fileoverview Core type definitions for RifaFacil application
 * 
 * This file contains all shared TypeScript interfaces and types used across
 * the frontend application. Centralizing types here ensures consistency
 * and makes refactoring easier.
 */

// ============================================================================
// USER & AUTHENTICATION TYPES
// ============================================================================

/**
 * Represents the subscription plan levels available to users
 * - 'free': Limited to 2 active raffles
 * - 'premium': Unlimited raffles and additional features
 */
export type UserPlan = 'free' | 'premium';

/**
 * Authentication provider used for user registration/login
 * - 'email': Traditional email/password authentication
 * - 'google': OAuth via Google (Emergent Auth)
 */
export type AuthProvider = 'email' | 'google';

/**
 * Core user data structure returned from authentication endpoints
 * This represents the authenticated user's profile information
 */
export interface User {
  /** Unique identifier (UUID) for the user */
  id: string;
  /** User's email address (unique, used for login) */
  email: string;
  /** Display name shown in UI */
  name: string;
  /** Current subscription plan level */
  plan: UserPlan;
  /** 
   * Super admin flag - bypasses all plan restrictions
   * Currently only mtortb@gmail.com has this privilege
   */
  is_super_admin: boolean;
  /** Optional profile picture URL (from Google OAuth) */
  picture?: string;
  /** ISO timestamp of account creation */
  created_at?: string;
}

/**
 * Response structure from login/register endpoints
 */
export interface AuthResponse {
  /** JWT token for authenticated requests */
  token: string;
  /** User profile data */
  user: User;
}

/**
 * Credentials for email/password login
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Data required for new user registration
 */
export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

// ============================================================================
// RAFFLE TYPES
// ============================================================================

/**
 * Lifecycle status of a raffle
 * - 'active': Open for ticket purchases, awaiting draw
 * - 'completed': Winner has been selected, raffle is closed
 * - 'cancelled': Raffle was cancelled before completion
 */
export type RaffleStatus = 'active' | 'completed' | 'cancelled';

/**
 * Status of an individual ticket within a raffle
 * - 'available': Can be purchased
 * - 'reserved': Temporarily held (cash payment pending)
 * - 'sold': Purchased and confirmed
 */
export type TicketStatus = 'available' | 'reserved' | 'sold';

/**
 * Individual ticket within a raffle
 * Each ticket represents one chance to win
 */
export interface Ticket {
  /** Ticket number (1-based, unique within raffle) */
  number: number;
  /** Current availability status */
  status: TicketStatus;
  /** Name of ticket buyer (if sold/reserved) */
  buyer_name?: string;
  /** Email of ticket buyer (for winner notification) */
  buyer_email?: string;
  /** Phone number of buyer (optional) */
  buyer_phone?: string;
  /** ISO timestamp of purchase */
  purchased_at?: string;
  /** Name of person who reserved (for cash payments) */
  reserved_by?: string;
  /** Order ID linking to cash payment order */
  order_id?: string;
  /** Flag if ticket was manually assigned by admin */
  assigned_by_admin?: boolean;
  /** Visual flag for UI - true if this ticket is the winner */
  isWinner?: boolean;
}

/**
 * Complete raffle data structure
 * Contains all information needed to display and manage a raffle
 */
export interface Raffle {
  /** Unique identifier (UUID) */
  id: string;
  /** Owner user ID */
  owner_id: string;
  /** Owner's display name */
  owner_name: string;
  /** Raffle title/name */
  title: string;
  /** Detailed description of the raffle */
  description: string;
  /** Description of what the winner receives */
  prize: string;
  /** URL to prize image (stored in /api/images/) */
  prize_image?: string;
  /** Price per ticket in MXN */
  ticket_price: number;
  /** Total number of tickets available */
  total_tickets: number;
  /** Numbers excluded from the raffle (e.g., unlucky numbers) */
  excluded_numbers: number[];
  /** Array of all tickets with their status */
  tickets: Ticket[];
  /** ISO date string of when the draw will occur */
  draw_date: string;
  /** Current lifecycle status */
  status: RaffleStatus;
  /** 8-character alphanumeric code for sharing */
  share_code: string;
  /** Winning ticket number (set after draw) */
  winning_number?: number;
  /** Winner's user ID (if they have an account) */
  winner_id?: string;
  /** 
   * Secret preselected winner number
   * NOTE: This is NEVER exposed in public API responses
   */
  preselected_winner?: number;
  /** Number of wheel spins before revealing winner (1-10) */
  spins_before_winner: number;
  /** Current spin count (resets when winner is selected) */
  current_spin_count: number;
  /** ISO timestamp of raffle creation */
  created_at: string;
}

/**
 * Simplified raffle data for list views (without full ticket array)
 */
export interface RaffleSummary {
  id: string;
  title: string;
  prize: string;
  prize_image?: string;
  ticket_price: number;
  total_tickets: number;
  draw_date: string;
  status: RaffleStatus;
  share_code: string;
  winning_number?: number;
  /** Count of sold tickets */
  sold_tickets: number;
  /** Count of available tickets */
  available_tickets: number;
  created_at: string;
}

/**
 * Data required to create a new raffle
 */
export interface CreateRaffleData {
  title: string;
  description: string;
  prize: string;
  prize_image?: string;
  ticket_price: number;
  total_tickets: number;
  draw_date: string;
  excluded_numbers?: number[];
  spins_before_winner?: number;
}

/**
 * Response from wheel spin endpoint
 */
export interface SpinResult {
  /** Which spin this is (1, 2, 3, etc.) */
  spin_number: number;
  /** Total spins required before winner reveal */
  spins_required: number;
  /** True if this was the final spin */
  is_final_spin: boolean;
  /** True if winner should be displayed */
  show_winner: boolean;
  /** The winning number (only on final spin) */
  winning_number?: number;
  /** Number to display on wheel (for non-final spins) */
  display_number?: number;
  /** Message to show user */
  message: string;
}

// ============================================================================
// PAYMENT TYPES
// ============================================================================

/**
 * Available payment methods
 * - 'mercadopago': Mexican payment processor (cards, OXXO, SPEI)
 * - 'stripe': International card payments
 * - 'paypal': PayPal checkout
 * - 'cash': In-person cash payment with reservation
 */
export type PaymentMethod = 'mercadopago' | 'stripe' | 'paypal' | 'cash';

/**
 * Status of a payment transaction
 */
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'refunded';

/**
 * Buyer information for ticket purchase
 */
export interface BuyerInfo {
  name: string;
  email: string;
  phone?: string;
}

/**
 * Request structure for creating a payment checkout
 */
export interface CheckoutRequest {
  raffle_id: string;
  ticket_numbers: number[];
  buyer_name: string;
  buyer_email: string;
  buyer_phone?: string;
  origin_url: string;
}

/**
 * Response from MercadoPago preference creation
 */
export interface MercadoPagoPreference {
  /** Unique preference ID from MercadoPago */
  preference_id: string;
  /** Production checkout URL */
  init_point: string;
  /** Sandbox/testing checkout URL */
  sandbox_init_point: string;
  /** Internal transaction ID for tracking */
  transaction_id: string;
}

/**
 * Cash payment order (reservation)
 */
export interface CashOrder {
  /** Unique order ID */
  id: string;
  /** Associated raffle */
  raffle_id: string;
  /** Reserved ticket numbers */
  ticket_numbers: number[];
  /** Buyer details */
  buyer_name: string;
  buyer_email: string;
  buyer_phone?: string;
  /** Total amount in MXN */
  amount: number;
  /** Order status */
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  /** ISO timestamp of creation */
  created_at: string;
  /** ISO timestamp of expiration (48h from creation) */
  expires_at: string;
}

// ============================================================================
// UI & COMPONENT TYPES
// ============================================================================

/**
 * Props for the TicketGrid component
 */
export interface TicketGridProps {
  /** Array of tickets to display */
  tickets: Ticket[];
  /** Currently selected ticket numbers */
  selectedTickets: number[];
  /** Callback when a ticket is clicked */
  onTicketClick: (ticketNumber: number) => void;
  /** Whether selection is disabled (e.g., raffle completed) */
  disabled?: boolean;
}

/**
 * Props for the SpinningWheel component
 */
export interface SpinningWheelProps {
  /** Numbers to display on the wheel */
  numbers: number[];
  /** Callback when spin completes */
  onSpinComplete: (number: number) => void;
  /** Whether currently spinning */
  isSpinning: boolean;
  /** Target number to land on (for rigged spins) */
  targetNumber?: number;
}

/**
 * Props for dialog components that need open/close control
 */
export interface DialogProps {
  /** Whether dialog is open */
  open: boolean;
  /** Callback to close dialog */
  onOpenChange: (open: boolean) => void;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Generic API error response structure
 */
export interface ApiError {
  detail: string;
  status_code?: number;
}

/**
 * Statistics returned from /api/stats endpoint
 */
export interface UserStats {
  total_raffles: number;
  active_raffles: number;
  completed_raffles: number;
  total_tickets_sold: number;
  total_revenue: number;
}

/**
 * User's purchased tickets grouped by raffle
 */
export interface MyTicketsResponse {
  raffle_id: string;
  raffle_title: string;
  prize: string;
  draw_date: string;
  status: RaffleStatus;
  winning_number?: number;
  share_code: string;
  tickets: Array<{
    number: number;
    purchased_at?: string;
  }>;
}
