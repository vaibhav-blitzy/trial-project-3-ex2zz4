import { useState, useEffect, useCallback, useRef } from 'react'; // v18.x
import { getLocalStorageItem, setLocalStorageItem, StorageError } from '../utils/storage.utils';

/**
 * Custom hook for type-safe localStorage operations with cross-tab synchronization
 * and comprehensive error handling.
 * 
 * @template T - The type of the stored value
 * @param {string} key - The localStorage key
 * @param {T} initialValue - The initial value if no stored value exists
 * @returns {[T, (value: T | ((val: T) => T)) => void]} Tuple of current value and setter
 * 
 * @throws {StorageError} When localStorage is unavailable or operations fail
 */
const useLocalStorage = <T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] => {
  // Ref to track component mount state
  const isMounted = useRef(true);
  
  // Memoized function to get initial state with error handling
  const getInitialState = useCallback((): T => {
    try {
      const storedValue = getLocalStorageItem<T>(key);
      return storedValue !== null ? storedValue : initialValue;
    } catch (error) {
      console.error(`Failed to get initial state for key ${key}:`, error);
      return initialValue;
    }
  }, [key, initialValue]);

  // Initialize state with stored or initial value
  const [storedValue, setStoredValue] = useState<T>(getInitialState);

  // Memoized setter function with error handling and type safety
  const setValue = useCallback((value: T | ((val: T) => T)): void => {
    if (!isMounted.current) return;

    try {
      // Handle both direct values and updater functions
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Update React state
      setStoredValue(valueToStore);
      
      // Update localStorage
      setLocalStorageItem(key, valueToStore);
      
      // Dispatch storage event for cross-tab synchronization
      window.dispatchEvent(new StorageEvent('storage', {
        key,
        newValue: JSON.stringify(valueToStore),
        storageArea: localStorage
      }));
    } catch (error) {
      console.error(`Failed to set value for key ${key}:`, error);
      
      // Handle quota exceeded error
      if (error instanceof StorageError && error.message.includes('quota exceeded')) {
        // Attempt to clear old data or handle quota exceeded scenario
        try {
          const currentSize = new Blob([JSON.stringify(localStorage)]).size;
          console.warn(`Storage quota warning - Current size: ${currentSize} bytes`);
          
          // Fallback to memory-only storage
          setStoredValue(value instanceof Function ? value(storedValue) : value);
        } catch (fallbackError) {
          console.error('Failed to handle storage quota error:', fallbackError);
        }
      }
      
      // Re-throw error for error boundary handling
      throw error;
    }
  }, [key, storedValue]);

  // Effect for cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent): void => {
      if (!isMounted.current) return;
      
      if (event.key === key && event.newValue !== null) {
        try {
          const newValue = JSON.parse(event.newValue) as T;
          setStoredValue(newValue);
        } catch (error) {
          console.error(`Failed to parse storage event value for key ${key}:`, error);
        }
      }
    };

    // Subscribe to storage events
    window.addEventListener('storage', handleStorageChange);

    // Cleanup function
    return () => {
      isMounted.current = false;
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key]);

  // Effect for automatic data migration and version changes
  useEffect(() => {
    const migrateData = async (): Promise<void> => {
      try {
        const currentVersion = localStorage.getItem(`${key}_version`);
        const LATEST_VERSION = '1.0'; // Update this when data structure changes
        
        if (currentVersion !== LATEST_VERSION) {
          // Perform data migration if needed
          setLocalStorageItem(`${key}_version`, LATEST_VERSION);
        }
      } catch (error) {
        console.error(`Failed to migrate data for key ${key}:`, error);
      }
    };

    migrateData();
  }, [key]);

  // Return current value and setter function
  return [storedValue, setValue];
};

export default useLocalStorage;