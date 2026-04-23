/**
 * @fileoverview TicketGrid Component
 * 
 * Displays a grid of raffle tickets with visual status indicators.
 * Used in both the public raffle view (for purchasing) and the
 * admin manage view (for seeing all tickets).
 * 
 * Visual States:
 * - Available (slate): Can be clicked to select
 * - Selected (orange): Currently selected for purchase
 * - Reserved (amber): Held for cash payment
 * - Sold (red): Already purchased
 * - Winner (gold): The winning ticket
 */

import React from 'react';
import { cn } from '../lib/utils';

/**
 * @typedef {Object} Ticket
 * @property {number} number - Ticket number (1-based)
 * @property {('available'|'reserved'|'sold')} status - Current ticket status
 * @property {string} [buyer_name] - Name of buyer (if sold)
 * @property {string} [reserved_by] - Name of person who reserved (if reserved)
 * @property {boolean} [isWinner] - Whether this ticket is the winning ticket
 */

/**
 * @typedef {Object} TicketGridProps
 * @property {Ticket[]} tickets - Array of tickets to display
 * @property {number[]} [selectedTickets] - Currently selected ticket numbers
 * @property {function(number): void} [onTicketClick] - Callback when ticket is clicked
 * @property {boolean} [disabled] - Whether all interactions are disabled
 * @property {boolean} [showBuyerName] - Whether to show buyer names in tooltips
 */

/**
 * Map ticket state to CSS class name.
 * 
 * This is extracted as a pure function for testability.
 * The class names map to styles defined in App.css.
 * 
 * @param {Ticket} ticket - The ticket to get class for
 * @param {number[]} selectedTickets - Currently selected ticket numbers
 * @returns {string} CSS class name for the ticket state
 */
const getTicketClassName = (ticket, selectedTickets = []) => {
  // Winner state takes highest priority
  if (ticket.isWinner) {
    return 'ticket-winner';
  }
  
  // Sold tickets (cannot be interacted with)
  if (ticket.status === 'sold') {
    return 'ticket-sold';
  }
  
  // Reserved for cash payment (cannot be selected)
  if (ticket.status === 'reserved') {
    return 'ticket-reserved';
  }
  
  // Currently selected by user
  if (selectedTickets.includes(ticket.number)) {
    return 'ticket-selected';
  }
  
  // Default: available for purchase
  return 'ticket-available';
};

/**
 * Generate tooltip text for a ticket.
 * 
 * Provides context about who owns/reserved the ticket.
 * 
 * @param {Ticket} ticket - The ticket to get tooltip for
 * @param {boolean} showBuyerName - Whether to show buyer info
 * @returns {string|undefined} Tooltip text or undefined if none
 */
const getTicketTooltip = (ticket, showBuyerName) => {
  if (ticket.status === 'sold' && showBuyerName && ticket.buyer_name) {
    return `Comprado por: ${ticket.buyer_name}`;
  }
  
  if (ticket.status === 'reserved') {
    return `Reservado por: ${ticket.reserved_by || 'Alguien'}`;
  }
  
  if (ticket.isWinner) {
    return '¡Boleto ganador!';
  }
  
  return undefined;
};

/**
 * Determine if a ticket can be clicked/selected.
 * 
 * @param {Ticket} ticket - The ticket to check
 * @param {boolean} disabled - Whether grid is globally disabled
 * @returns {boolean} True if ticket is clickable
 */
const isTicketClickable = (ticket, disabled) => {
  if (disabled) return false;
  return ticket.status === 'available';
};

/**
 * TicketGrid Component
 * 
 * Renders a responsive grid of ticket buttons with status-based styling.
 * 
 * Features:
 * - Responsive: 5 columns on mobile, 10 on desktop
 * - Visual status indicators with colors and icons
 * - Tooltips showing buyer/reserved info
 * - Keyboard accessible (buttons are focusable)
 * 
 * @param {TicketGridProps} props - Component props
 * @returns {JSX.Element} Rendered ticket grid
 * 
 * @example
 * <TicketGrid
 *   tickets={raffle.tickets}
 *   selectedTickets={[1, 5, 12]}
 *   onTicketClick={(num) => toggleSelection(num)}
 *   disabled={raffle.status === 'completed'}
 * />
 */
const TicketGrid = ({ 
  tickets, 
  selectedTickets = [], 
  onTicketClick, 
  disabled = false, 
  showBuyerName = false 
}) => {
  /**
   * Handle ticket button click.
   * Only triggers callback for available tickets.
   * 
   * @param {Ticket} ticket - The clicked ticket
   */
  const handleTicketClick = (ticket) => {
    if (isTicketClickable(ticket, disabled) && onTicketClick) {
      onTicketClick(ticket.number);
    }
  };

  return (
    <div 
      className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2"
      role="group"
      aria-label="Ticket selection grid"
    >
      {tickets.map((ticket) => {
        const ticketClass = getTicketClassName(ticket, selectedTickets);
        const tooltip = getTicketTooltip(ticket, showBuyerName);
        const clickable = isTicketClickable(ticket, disabled);
        
        return (
          <button
            key={ticket.number}
            onClick={() => handleTicketClick(ticket)}
            disabled={!clickable}
            className={cn(
              // Base styles
              'aspect-square rounded-lg font-mono text-sm font-medium',
              'flex flex-col items-center justify-center',
              'transition-all duration-200',
              // Status-specific styles
              ticketClass,
              // Cursor styles
              clickable ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed'
            )}
            data-testid={`ticket-${ticket.number}`}
            title={tooltip}
            aria-label={`Boleto ${ticket.number}, ${ticket.status}`}
            aria-pressed={selectedTickets.includes(ticket.number)}
          >
            <span>{ticket.number}</span>
            
            {/* Winner indicator */}
            {ticket.isWinner && (
              <span className="text-xs mt-0.5" aria-hidden="true">🏆</span>
            )}
            
            {/* Reserved indicator */}
            {ticket.status === 'reserved' && (
              <span className="text-xs mt-0.5" aria-hidden="true">⏳</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default TicketGrid;
