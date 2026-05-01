/**
 * A simple fetch wrapper for making API calls to our Express backend.
 * Uses the proxy defined in vite.config.ts (so /api points to localhost:5000).
 */

const BASE_URL = '/api';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${endpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API request failed with status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    throw error;
  }
}
