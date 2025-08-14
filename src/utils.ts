/**
 * Creates a debounced version of the provided function that delays execution until after
 * the specified wait time has elapsed since the last time it was called.
 * 
 * @template T - The function type
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay execution
 * @returns A debounced version of the function
 * 
 * @example
 * ```typescript
 * import { debounce } from 'transcript-monitor-agent';
 * 
 * const debouncedLog = debounce((message: string) => {
 *   console.log(message);
 * }, 1000);
 * 
 * // Only the last call within 1 second will execute
 * debouncedLog('Message 1');
 * debouncedLog('Message 2');
 * debouncedLog('Message 3'); // Only this will be logged after 1 second
 * ```
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;
    
    return function (...args: Parameters<T>) {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }
  
/**
 * Retries an async operation with exponential backoff on failure.
 * 
 * @template T - The return type of the function
 * @param fn - The async function to retry
 * @param maxAttempts - Maximum number of retry attempts (default: 3)
 * @param delay - Initial delay in milliseconds between retries (default: 1000)
 * @returns Promise that resolves with the result or throws the last error
 * @throws {Error} The last error encountered if all attempts fail
 * 
 * @example
 * ```typescript
 * import { retry } from 'transcript-monitor-agent';
 * 
 * const result = await retry(
 *   async () => {
 *     const response = await fetch('/api/data');
 *     if (!response.ok) throw new Error('Failed to fetch');
 *     return response.json();
 *   },
 *   3,  // Max 3 attempts
 *   500 // Start with 500ms delay, increases exponentially
 * );
 * 
 * console.log('Retrieved data:', result);
 * ```
 */
export async function retry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (i < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
      }
    }
    
    throw lastError!;
  }