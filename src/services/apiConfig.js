/**
 * Global API Configuration for Dhun
 *
 * In production, automatically routes to Vercel Serverless Edge API (same-origin relative '').
 * In local dev, routes to 'http://localhost:8000'.
 * Supports custom VITE_API_URL if configured.
 */
const envUrl = (import.meta.env.VITE_API_URL || '').trim();
const isSuspendedEndpoint = envUrl.includes('dhun-app-qgt6v12grh65.the-rawkc.deno.net');

export const API_BASE = (
  envUrl && !isSuspendedEndpoint
    ? envUrl
    : (import.meta.env.PROD ? '' : 'http://localhost:8000')
).replace(/\/+$/, '');
