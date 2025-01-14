/**
 * @fileoverview Frontend route constants and path configurations for the task management system
 * Defines comprehensive routing structure supporting all UI components, views and responsive layouts
 * @version 1.0.0
 */

/**
 * Base application route path
 */
const BASE_PATH = '/' as const;

/**
 * Application route paths and configurations
 * Provides comprehensive routing structure for all UI components and views
 */
export const ROUTES = {
  ROOT: BASE_PATH,

  AUTH: {
    ROOT: '/auth',
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
    LOGOUT: '/auth/logout',
    TWO_FACTOR: '/auth/2fa',
  },

  DASHBOARD: {
    ROOT: '/dashboard',
    OVERVIEW: '/dashboard/overview',
    ACTIVITY: '/dashboard/activity', 
    ANALYTICS: '/dashboard/analytics',
    NOTIFICATIONS: '/dashboard/notifications',
    SEARCH: '/dashboard/search',
  },

  PROJECTS: {
    ROOT: '/projects',
    LIST: '/projects',
    CREATE: '/projects/create',
    DETAIL: '/projects/:id',
    EDIT: '/projects/:id/edit',
    MEMBERS: '/projects/:id/members',
    SETTINGS: '/projects/:id/settings',
    ANALYTICS: '/projects/:id/analytics',
    TIMELINE: '/projects/:id/timeline',
    DOCUMENTS: '/projects/:id/documents',
    INTEGRATIONS: '/projects/:id/integrations',
  },

  TASKS: {
    ROOT: '/tasks',
    LIST: '/tasks',
    CREATE: '/tasks/create',
    DETAIL: '/tasks/:id',
    EDIT: '/tasks/:id/edit',
    BOARD: '/tasks/board',
    CALENDAR: '/tasks/calendar',
    TIMELINE: '/tasks/timeline',
    FILTERS: '/tasks/filters',
    TEMPLATES: '/tasks/templates',
    REPORTS: '/tasks/reports',
  },

  TEAMS: {
    ROOT: '/teams',
    LIST: '/teams',
    CREATE: '/teams/create',
    DETAIL: '/teams/:id',
    EDIT: '/teams/:id/edit',
    MEMBERS: '/teams/:id/members',
    ROLES: '/teams/:id/roles',
    PERMISSIONS: '/teams/:id/permissions',
    ACTIVITY: '/teams/:id/activity',
    ANALYTICS: '/teams/:id/analytics',
  },

  SETTINGS: {
    ROOT: '/settings',
    PROFILE: '/settings/profile',
    SECURITY: '/settings/security',
    NOTIFICATIONS: '/settings/notifications',
    INTEGRATIONS: '/settings/integrations',
    PREFERENCES: '/settings/preferences',
    BILLING: '/settings/billing',
    API: '/settings/api',
    TEAM: '/settings/team',
  },

  ERROR: {
    NOT_FOUND: '/404',
    SERVER_ERROR: '/500',
    FORBIDDEN: '/403',
    UNAUTHORIZED: '/401',
    MAINTENANCE: '/maintenance',
    OFFLINE: '/offline',
  },
} as const;

/**
 * Type definitions for route paths to ensure type safety when using routes
 */
export type Routes = typeof ROUTES;
export type RoutePaths = Routes[keyof Routes];