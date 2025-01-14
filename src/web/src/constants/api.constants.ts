/**
 * API Constants
 * Defines API-related constants including endpoints, status codes, and request configurations
 * @version 1.0.0
 */

// API Version and Base URL
export const API_VERSION = 'v1';
export const API_BASE_URL = `/api/${API_VERSION}`;

// Interface definitions for type safety
interface AuthEndpoints {
  LOGIN: string;
  LOGOUT: string;
  REFRESH: string;
  REGISTER: string;
}

interface TaskEndpoints {
  BASE: string;
  GET_ALL: string;
  GET_BY_ID: string;
  CREATE: string;
  UPDATE: string;
  DELETE: string;
  ASSIGN: string;
}

interface ProjectEndpoints {
  BASE: string;
  GET_ALL: string;
  GET_BY_ID: string;
  CREATE: string;
  UPDATE: string;
  DELETE: string;
  MEMBERS: string;
}

interface TeamEndpoints {
  BASE: string;
  GET_ALL: string;
  GET_BY_ID: string;
  CREATE: string;
  UPDATE: string;
  DELETE: string;
  MEMBERS: string;
}

interface FileEndpoints {
  BASE: string;
  UPLOAD: string;
  DOWNLOAD: string;
  DELETE: string;
}

export interface ApiEndpoints {
  AUTH: AuthEndpoints;
  TASKS: TaskEndpoints;
  PROJECTS: ProjectEndpoints;
  TEAMS: TeamEndpoints;
  FILES: FileEndpoints;
}

// API Endpoints configuration
export const API_ENDPOINTS: Readonly<ApiEndpoints> = Object.freeze({
  AUTH: Object.freeze({
    LOGIN: `${API_BASE_URL}/auth/login`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
    REFRESH: `${API_BASE_URL}/auth/refresh`,
    REGISTER: `${API_BASE_URL}/auth/register`
  }),
  TASKS: Object.freeze({
    BASE: `${API_BASE_URL}/tasks`,
    GET_ALL: `${API_BASE_URL}/tasks`,
    GET_BY_ID: `${API_BASE_URL}/tasks/:id`,
    CREATE: `${API_BASE_URL}/tasks`,
    UPDATE: `${API_BASE_URL}/tasks/:id`,
    DELETE: `${API_BASE_URL}/tasks/:id`,
    ASSIGN: `${API_BASE_URL}/tasks/:id/assign`
  }),
  PROJECTS: Object.freeze({
    BASE: `${API_BASE_URL}/projects`,
    GET_ALL: `${API_BASE_URL}/projects`,
    GET_BY_ID: `${API_BASE_URL}/projects/:id`,
    CREATE: `${API_BASE_URL}/projects`,
    UPDATE: `${API_BASE_URL}/projects/:id`,
    DELETE: `${API_BASE_URL}/projects/:id`,
    MEMBERS: `${API_BASE_URL}/projects/:id/members`
  }),
  TEAMS: Object.freeze({
    BASE: `${API_BASE_URL}/teams`,
    GET_ALL: `${API_BASE_URL}/teams`,
    GET_BY_ID: `${API_BASE_URL}/teams/:id`,
    CREATE: `${API_BASE_URL}/teams`,
    UPDATE: `${API_BASE_URL}/teams/:id`,
    DELETE: `${API_BASE_URL}/teams/:id`,
    MEMBERS: `${API_BASE_URL}/teams/:id/members`
  }),
  FILES: Object.freeze({
    BASE: `${API_BASE_URL}/files`,
    UPLOAD: `${API_BASE_URL}/files/upload`,
    DOWNLOAD: `${API_BASE_URL}/files/:id/download`,
    DELETE: `${API_BASE_URL}/files/:id`
  })
});

// HTTP Status codes interface
export interface HttpStatus {
  OK: 200;
  CREATED: 201;
  BAD_REQUEST: 400;
  UNAUTHORIZED: 401;
  FORBIDDEN: 403;
  NOT_FOUND: 404;
  CONFLICT: 409;
  TOO_MANY_REQUESTS: 429;
  INTERNAL_SERVER_ERROR: 500;
  SERVICE_UNAVAILABLE: 503;
}

// HTTP Status codes configuration
export const HTTP_STATUS: Readonly<HttpStatus> = Object.freeze({
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
});

// Error code interfaces
interface AuthErrorCodes {
  INVALID_CREDENTIALS: 1001;
  TOKEN_EXPIRED: 1002;
  INVALID_TOKEN: 1003;
}

interface ValidationErrorCodes {
  INVALID_INPUT: 3001;
  MISSING_REQUIRED: 3002;
  INVALID_FORMAT: 3003;
}

interface BusinessErrorCodes {
  TASK_ALREADY_COMPLETED: 4001;
  PROJECT_ALREADY_EXISTS: 4002;
  INSUFFICIENT_PERMISSIONS: 4003;
}

interface SystemErrorCodes {
  DATABASE_ERROR: 5001;
  SERVICE_UNAVAILABLE: 5002;
  INTEGRATION_ERROR: 5003;
}

export interface ErrorCodes {
  AUTH_ERROR: AuthErrorCodes;
  VALIDATION_ERROR: ValidationErrorCodes;
  BUSINESS_ERROR: BusinessErrorCodes;
  SYSTEM_ERROR: SystemErrorCodes;
}

// Error codes configuration
export const ERROR_CODES: Readonly<ErrorCodes> = Object.freeze({
  AUTH_ERROR: Object.freeze({
    INVALID_CREDENTIALS: 1001,
    TOKEN_EXPIRED: 1002,
    INVALID_TOKEN: 1003
  }),
  VALIDATION_ERROR: Object.freeze({
    INVALID_INPUT: 3001,
    MISSING_REQUIRED: 3002,
    INVALID_FORMAT: 3003
  }),
  BUSINESS_ERROR: Object.freeze({
    TASK_ALREADY_COMPLETED: 4001,
    PROJECT_ALREADY_EXISTS: 4002,
    INSUFFICIENT_PERMISSIONS: 4003
  }),
  SYSTEM_ERROR: Object.freeze({
    DATABASE_ERROR: 5001,
    SERVICE_UNAVAILABLE: 5002,
    INTEGRATION_ERROR: 5003
  })
});