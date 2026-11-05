/**
 * Global API Configuration for Dhun
 *
 * In local development, defaults to 'http://localhost:8000'.
 * In production / deployment, configure VITE_API_URL (e.g. https://your-verome-api.deno.dev).
 */
export const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
