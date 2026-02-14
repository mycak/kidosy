/**
 * Application routing paths
 * Centralized path constants for type-safe routing
 */

export const PATHS = {
  // Public routes
  HOME: '/',
  OFFER_DETAILS: '/offers/:id',
  
  // Auth routes
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    PASSWORD_RESET: '/auth/password-reset',
    PASSWORD_RESET_CONFIRM: '/auth/password-reset/confirm',
  },
  
  // Organizer routes (authenticated)
  ORGANIZER: {
    DASHBOARD: '/organizer/dashboard',
    OFFERS: '/organizer/offers',
    OFFERS_NEW: '/organizer/offers/new',
    OFFERS_EDIT: '/organizer/offers/:id/edit',
    LEADS: '/organizer/leads',
    PROFILE: '/organizer/profile',
  },
  
  // Admin routes
  ADMIN: {
    PENDING: '/admin/pending',
    DUPLICATES: '/admin/duplicates',
    USERS: '/admin/users',
    EMAIL_LOGS: '/admin/email-logs',
  },
} as const;

/**
 * Helper functions for dynamic path generation
 */
export const buildPath = {
  offerDetails: (id: string) => `/offers/${id}`,
  offerEdit: (id: string) => `/organizer/offers/${id}/edit`,
} as const;

/**
 * Path patterns for route matching
 */
export const PATH_PATTERNS = {
  OFFER_DETAILS: /^\/offers\/[a-f0-9-]+$/,
  OFFER_EDIT: /^\/organizer\/offers\/[a-f0-9-]+\/edit$/,
} as const;
