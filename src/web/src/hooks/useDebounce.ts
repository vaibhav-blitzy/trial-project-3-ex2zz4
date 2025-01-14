import { useState, useEffect } from 'react'; // react@^18.0.0

/**
 * A custom hook that provides a debounced version of a value.
 * Useful for preventing excessive updates in response to rapidly changing values.
 * 
 * @template T - The type of the value being debounced
 * @param {T} value - The value to debounce
 * @param {number} [delay=300] - The delay in milliseconds (defaults to 300ms)
 * @returns {T} The debounced value
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 500);
 */
const useDebounce = <T>(value: T, delay: number = 300): T => {
  // Store the debounced value in state to ensure proper re-renders
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Development mode validation for delay parameter
    if (process.env.NODE_ENV === 'development') {
      if (delay < 0 || !Number.isFinite(delay)) {
        console.warn(
          `[useDebounce] Invalid delay parameter: ${delay}. Using default delay of 300ms.`
        );
      }
    }

    // Ensure delay is positive and finite, fallback to default if not
    const safeDelay = delay >= 0 && Number.isFinite(delay) ? delay : 300;

    // Create timeout to update the debounced value
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, safeDelay);

    // Cleanup function to clear timeout on unmount or value/delay changes
    return () => {
      clearTimeout(timeoutId);
    };
  }, [value, delay]); // Re-run effect when value or delay changes

  return debouncedValue;
};

export default useDebounce;