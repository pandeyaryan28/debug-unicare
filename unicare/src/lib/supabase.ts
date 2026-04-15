import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vtuujzlscnxiyxokxntk.supabase.co';

// Fallback to bundled key so production builds don't silently fail with 403s
// when the env var isn't injected by the hosting platform.
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_adwmc0mDxdY0sKg08uSywg_-275SasT';

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('[supabase] NEXT_PUBLIC_SUPABASE_ANON_KEY is not set — using bundled fallback key.');
}

/**
 * Custom fetch wrapper to fix Chrome/Chromium UDP QUIC connection failures.
 * Certain ISPs drop UDP packets, causing `ERR_CONNECTION_TIMED_OUT` or 
 * `ERR_QUIC_PROTOCOL_ERROR` on Supabase REST requests.
 * Adding `cache: 'no-store'` forces the browser to use TCP (HTTP/1.1 or HTTP/2)
 * instead of HTTP/3 for data requests, while bypassing this for auth endpoints
 * to keep OAuth and PKCE caching working intact.
 */
const customFetch = (url: RequestInfo | URL, options: RequestInit = {}): Promise<Response> => {
  const urlStr = url.toString();
  
  // Skip modifying auth endpoints to preserve required login mechanisms
  if (!urlStr.includes('/auth/v1/')) {
    // Force TCP over UDP by disabling HTTP3 cache behaviors
    options.cache = 'no-store';
  }

  // No AbortController artificial timeouts. Use actual native fetch.
  return fetch(url, options);
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use PKCE for better security and reliability
    flowType: 'pkce',
    // Persist session in localStorage (default, but explicit)
    persistSession: true,
    // Let Supabase handle token refresh automatically
    autoRefreshToken: true,
    // Detect session from URL when returning from OAuth redirect
    detectSessionInUrl: true,
  },
  global: {
    fetch: customFetch,
  },
});
