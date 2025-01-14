import { isString } from 'lodash'; // v4.17.21

/**
 * Centralized storage keys to prevent duplication and typos
 */
export const STORAGE_KEYS = {
  THEME: 'app_theme',
  AUTH_TOKEN: 'auth_token',
  USER_SETTINGS: 'user_settings'
} as const;

/**
 * Custom error class for storage-related operations
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly key?: string,
    public readonly operation?: 'get' | 'set' | 'remove'
  ) {
    super(message);
    this.name = 'StorageError';
    Object.setPrototypeOf(this, StorageError.prototype);
  }
}

/**
 * Type guard to check if storage is available
 */
const isStorageAvailable = (storageType: 'localStorage' | 'sessionStorage'): boolean => {
  try {
    const storage = window[storageType];
    const testKey = '__storage_test__';
    storage.setItem(testKey, testKey);
    storage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Validates storage key format and presence
 */
const validateKey = (key: string): void => {
  if (!isString(key) || !key.trim()) {
    throw new StorageError('Invalid storage key provided', key, 'get');
  }
};

/**
 * Safely serializes value to JSON with error handling
 */
const safeSerialize = <T>(value: T, key: string): string => {
  try {
    return JSON.stringify(value);
  } catch (error) {
    throw new StorageError(
      `Failed to serialize value for key: ${key}`,
      key,
      'set'
    );
  }
};

/**
 * Safely parses JSON data with type checking
 */
const safeParse = <T>(value: string | null, key: string): T | null => {
  if (!value) return null;
  
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    throw new StorageError(
      `Failed to parse value for key: ${key}`,
      key,
      'get'
    );
  }
};

/**
 * Sets an item in localStorage with type safety and validation
 */
export const setLocalStorageItem = <T>(key: string, value: T): void => {
  validateKey(key);
  
  if (!isStorageAvailable('localStorage')) {
    throw new StorageError('localStorage is not available', key, 'set');
  }

  try {
    const serializedValue = safeSerialize(value, key);
    localStorage.setItem(key, serializedValue);
  } catch (error) {
    if (error instanceof StorageError) throw error;
    
    if ((error as Error).name === 'QuotaExceededError') {
      throw new StorageError('Storage quota exceeded', key, 'set');
    }
    
    throw new StorageError(
      `Failed to set item in localStorage: ${(error as Error).message}`,
      key,
      'set'
    );
  }
};

/**
 * Retrieves and parses an item from localStorage with type safety
 */
export const getLocalStorageItem = <T>(key: string): T | null => {
  validateKey(key);
  
  if (!isStorageAvailable('localStorage')) {
    throw new StorageError('localStorage is not available', key, 'get');
  }

  try {
    const value = localStorage.getItem(key);
    return safeParse<T>(value, key);
  } catch (error) {
    if (error instanceof StorageError) throw error;
    
    throw new StorageError(
      `Failed to get item from localStorage: ${(error as Error).message}`,
      key,
      'get'
    );
  }
};

/**
 * Sets an item in sessionStorage with validation and error handling
 */
export const setSessionStorageItem = <T>(key: string, value: T): void => {
  validateKey(key);
  
  if (!isStorageAvailable('sessionStorage')) {
    throw new StorageError('sessionStorage is not available', key, 'set');
  }

  try {
    const serializedValue = safeSerialize(value, key);
    sessionStorage.setItem(key, serializedValue);
  } catch (error) {
    if (error instanceof StorageError) throw error;
    
    if ((error as Error).name === 'QuotaExceededError') {
      throw new StorageError('Session storage quota exceeded', key, 'set');
    }
    
    throw new StorageError(
      `Failed to set item in sessionStorage: ${(error as Error).message}`,
      key,
      'set'
    );
  }
};

/**
 * Retrieves and parses an item from sessionStorage with type checking
 */
export const getSessionStorageItem = <T>(key: string): T | null => {
  validateKey(key);
  
  if (!isStorageAvailable('sessionStorage')) {
    throw new StorageError('sessionStorage is not available', key, 'get');
  }

  try {
    const value = sessionStorage.getItem(key);
    return safeParse<T>(value, key);
  } catch (error) {
    if (error instanceof StorageError) throw error;
    
    throw new StorageError(
      `Failed to get item from sessionStorage: ${(error as Error).message}`,
      key,
      'get'
    );
  }
};

/**
 * Safely removes an item from localStorage with validation
 */
export const removeLocalStorageItem = (key: string): void => {
  validateKey(key);
  
  if (!isStorageAvailable('localStorage')) {
    throw new StorageError('localStorage is not available', key, 'remove');
  }

  try {
    localStorage.removeItem(key);
  } catch (error) {
    throw new StorageError(
      `Failed to remove item from localStorage: ${(error as Error).message}`,
      key,
      'remove'
    );
  }
};

/**
 * Safely removes an item from sessionStorage with validation
 */
export const removeSessionStorageItem = (key: string): void => {
  validateKey(key);
  
  if (!isStorageAvailable('sessionStorage')) {
    throw new StorageError('sessionStorage is not available', key, 'remove');
  }

  try {
    sessionStorage.removeItem(key);
  } catch (error) {
    throw new StorageError(
      `Failed to remove item from sessionStorage: ${(error as Error).message}`,
      key,
      'remove'
    );
  }
};