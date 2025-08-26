import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Load environment variables from a .env file
 */
export function loadEnvFile(envPath: string = '.env'): void {
  try {
    const envFile = readFileSync(envPath, 'utf8');
    const lines = envFile.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }

      const equalIndex = trimmedLine.indexOf('=');
      if (equalIndex === -1) {
        continue;
      }

      const key = trimmedLine.slice(0, equalIndex).trim();
      const value = trimmedLine.slice(equalIndex + 1).trim();

      // Remove quotes if present
      const cleanValue = value.replace(/^["']|["']$/g, '');

      // Only set if not already defined
      if (!process.env[key]) {
        process.env[key] = cleanValue;
      }
    }
  } catch (error) {
    // Silently fail if .env file doesn't exist
    if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * Format a date to YYYY-MM-DD format
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format a datetime to ISO string format
 */
export function formatDateTime(date: Date): string {
  return date.toISOString();
}

/**
 * Parse a date string in various formats to Date object
 */
export function parseDate(dateString: string): Date {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateString}`);
  }
  return date;
}

/**
 * Get date range for common periods
 */
export function getDateRange(period: 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth'): { startDate: string; endDate: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case 'today': {
      return {
        startDate: formatDate(today),
        endDate: formatDate(today),
      };
    }

    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        startDate: formatDate(yesterday),
        endDate: formatDate(yesterday),
      };
    }

    case 'thisWeek': {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return {
        startDate: formatDate(startOfWeek),
        endDate: formatDate(endOfWeek),
      };
    }

    case 'lastWeek': {
      const startOfLastWeek = new Date(today);
      startOfLastWeek.setDate(today.getDate() - today.getDay() - 7);
      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
      return {
        startDate: formatDate(startOfLastWeek),
        endDate: formatDate(endOfLastWeek),
      };
    }

    case 'thisMonth': {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return {
        startDate: formatDate(startOfMonth),
        endDate: formatDate(endOfMonth),
      };
    }

    case 'lastMonth': {
      const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      return {
        startDate: formatDate(startOfLastMonth),
        endDate: formatDate(endOfLastMonth),
      };
    }

    default: {
      throw new Error(`Unsupported period: ${period}`);
    }
  }
}

/**
 * Pretty print JSON with proper formatting
 */
export function prettyPrint(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Sanitise string for logging (remove sensitive information)
 */
export function sanitiseForLogging(text: string): string {
  return text
    .replace(/api_key=[^&\s]*/gi, 'api_key=***')
    .replace(/password=[^&\s]*/gi, 'password=***')
    .replace(/token=[^&\s]*/gi, 'token=***');
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
  } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxAttempts) {
        throw lastError;
      }

      await sleep(Math.min(delay, maxDelay));
      delay *= backoffFactor;
    }
  }

  throw lastError!;
}
