// @package cors@2.8.5
import { CorsOptions } from 'cors';

/**
 * Allowed origins for CORS requests
 * Filters out any undefined/null values from environment variables
 */
const ALLOWED_ORIGINS: string[] = [
    process.env.FRONTEND_URL,
    process.env.ADMIN_URL
].filter(Boolean);

/**
 * Allowed HTTP methods for CORS requests
 * Follows security best practices by explicitly defining allowed methods
 */
const ALLOWED_METHODS: string[] = [
    'GET',
    'POST',
    'PUT',
    'DELETE',
    'PATCH',
    'OPTIONS'
];

/**
 * Allowed headers for CORS requests
 * Explicitly defines headers that can be sent by the client
 */
const ALLOWED_HEADERS: string[] = [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-API-Key'
];

/**
 * Headers exposed to the client
 * Defines headers that can be exposed to the client browser
 */
const EXPOSED_HEADERS: string[] = [
    'Content-Length',
    'X-Rate-Limit',
    'X-Request-ID'
];

/**
 * Maximum age for CORS preflight requests cache in seconds
 * Set to 24 hours (86400 seconds) to reduce preflight requests
 */
const MAX_AGE: number = 86400;

/**
 * Validates if the requesting origin is allowed to access the API
 * Implements strict origin validation with security checks
 * 
 * @param origin - The origin of the request
 * @returns boolean indicating if the origin is allowed
 */
const validateOrigin = (origin: string): boolean => {
    // Return false if origin is undefined or null
    if (!origin) {
        return false;
    }

    // Sanitize origin to prevent injection
    const sanitizedOrigin = origin.toLowerCase().trim();

    // Check if sanitized origin is in allowed origins list
    return ALLOWED_ORIGINS.some(allowedOrigin => 
        allowedOrigin && sanitizedOrigin === allowedOrigin.toLowerCase()
    );
};

/**
 * CORS configuration object implementing secure cross-origin resource sharing
 * Follows security best practices and implements strict validation
 */
export const corsConfig: CorsOptions = {
    // Dynamic origin validation with callback
    origin: (origin: string, callback: (err: Error | null, allow: boolean) => void) => {
        if (!origin || validateOrigin(origin)) {
            // Allow requests with no origin (like mobile apps or curl requests)
            // or requests from allowed origins
            callback(null, true);
        } else {
            // Reject requests from unauthorized origins
            callback(new Error('CORS: Request origin not allowed'), false);
        }
    },
    // Allowed HTTP methods
    methods: ALLOWED_METHODS,
    // Allowed headers
    allowedHeaders: ALLOWED_HEADERS,
    // Exposed headers
    exposedHeaders: EXPOSED_HEADERS,
    // Allow credentials (cookies, authorization headers)
    credentials: true,
    // Preflight request cache duration
    maxAge: MAX_AGE,
    // Do not pass the preflight response to next handlers
    preflightContinue: false,
    // Return 204 No Content for preflight requests
    optionsSuccessStatus: 204
};