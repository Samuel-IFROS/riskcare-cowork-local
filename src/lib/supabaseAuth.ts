// ========= Copyright 2025-2026 @ Eigent.ai All Rights Reserved. =========
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// ========= Copyright 2025-2026 @ Eigent.ai All Rights Reserved. =========

export const LOCAL_GOOGLE_AUTH_ORIGIN = 'http://localhost:3000';
export const LOCAL_GOOGLE_AUTH_CALLBACK = `${LOCAL_GOOGLE_AUTH_ORIGIN}/auth/callback`;
export const SUPABASE_GOOGLE_PKCE_KEY = 'supabase-google-pkce-verifier';
const RISKCARE_RUNTIME_CONFIG_STORAGE_KEY = 'riskcare-runtime-config';
const RISKCARE_RUNTIME_CONFIG_EVENT = 'riskcare-runtime-config-changed';

type SupabaseAuthConfig = {
  supabaseUrl: string;
  publishableKey: string;
};

type RiskcareRuntimeConfigKey =
  | 'RISKCARE_SUPABASE_URL'
  | 'RISKCARE_SUPABASE_PUBLISHABLE_KEY'
  | 'RISKCARE_PROFILE_URL';

type RiskcareRuntimeConfig = Partial<Record<RiskcareRuntimeConfigKey, string>>;

function isBrowserRuntime(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function getStoredRuntimeConfig(): RiskcareRuntimeConfig {
  if (!isBrowserRuntime()) {
    return {};
  }

  try {
    const raw = localStorage.getItem(RISKCARE_RUNTIME_CONFIG_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const runtimeConfig: RiskcareRuntimeConfig = {};

    for (const key of [
      'RISKCARE_SUPABASE_URL',
      'RISKCARE_SUPABASE_PUBLISHABLE_KEY',
      'RISKCARE_PROFILE_URL',
    ] as const) {
      const value = parsed[key];
      if (typeof value === 'string' && value.trim()) {
        runtimeConfig[key] = value.trim();
      }
    }

    return runtimeConfig;
  } catch {
    return {};
  }
}

function readRuntimeConfigValue(...keys: string[]): string {
  const runtimeConfig = getStoredRuntimeConfig() as Record<
    string,
    string | undefined
  >;

  for (const key of keys) {
    const value = runtimeConfig[key]?.trim();
    if (value) {
      return value;
    }
  }

  return '';
}

function readConfigValue(...keys: string[]): string {
  const runtimeValue = readRuntimeConfigValue(...keys);
  if (runtimeValue) {
    return runtimeValue;
  }

  const env = import.meta.env as Record<string, string | undefined>;
  for (const key of keys) {
    const value = env[key]?.trim();
    if (value) {
      return value;
    }
  }
  return '';
}

export function setRiskcareRuntimeConfig(
  nextConfig: RiskcareRuntimeConfig
): boolean {
  if (!isBrowserRuntime()) {
    return false;
  }

  const currentConfig = getStoredRuntimeConfig();
  const mergedConfig: RiskcareRuntimeConfig = { ...currentConfig };
  let changed = false;

  for (const [key, value] of Object.entries(nextConfig) as Array<
    [RiskcareRuntimeConfigKey, string | undefined]
  >) {
    const normalizedValue = value?.trim() || '';
    if (!normalizedValue) {
      if (key in mergedConfig) {
        delete mergedConfig[key];
        changed = true;
      }
      continue;
    }

    if (mergedConfig[key] !== normalizedValue) {
      mergedConfig[key] = normalizedValue;
      changed = true;
    }
  }

  if (!changed) {
    return false;
  }

  localStorage.setItem(
    RISKCARE_RUNTIME_CONFIG_STORAGE_KEY,
    JSON.stringify(mergedConfig)
  );
  window.dispatchEvent(new Event(RISKCARE_RUNTIME_CONFIG_EVENT));
  return true;
}

export function subscribeRiskcareRuntimeConfig(
  listener: () => void
): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  window.addEventListener(RISKCARE_RUNTIME_CONFIG_EVENT, listener);
  return () => {
    window.removeEventListener(RISKCARE_RUNTIME_CONFIG_EVENT, listener);
  };
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function randomString(length: number): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

export function hasSupabaseAuthConfig(): boolean {
  const config = getSupabaseAuthConfig();
  if (!config) return false;

  try {
    const parsed = new URL(config.supabaseUrl);
    return parsed.protocol === 'https:' && config.publishableKey.length > 20;
  } catch {
    return false;
  }
}

export function getSupabaseAuthConfig(): SupabaseAuthConfig | null {
  const supabaseUrl = readConfigValue(
    'RISKCARE_SUPABASE_URL',
    'VITE_RISKCARE_SUPABASE_URL',
    'VITE_SUPABASE_URL'
  );
  const publishableKey = readConfigValue(
    'RISKCARE_SUPABASE_PUBLISHABLE_KEY',
    'VITE_RISKCARE_SUPABASE_PUBLISHABLE_KEY',
    'VITE_SUPABASE_PUBLISHABLE_KEY'
  );

  if (!supabaseUrl || !publishableKey) {
    return null;
  }

  return {
    supabaseUrl,
    publishableKey,
  };
}

export function getProfileManagementUrl(email?: string | null): string | null {
  const configuredUrl = readConfigValue(
    'RISKCARE_PROFILE_URL',
    'VITE_RISKCARE_PROFILE_URL',
    'VITE_PROFILE_MANAGEMENT_URL'
  );

  if (!configuredUrl) {
    return null;
  }

  const replacedUrl =
    email && configuredUrl.includes('{{email}}')
      ? configuredUrl.replaceAll('{{email}}', encodeURIComponent(email))
      : configuredUrl;

  try {
    const url = new URL(replacedUrl);
    if (email && !configuredUrl.includes('{{email}}')) {
      url.searchParams.set('email', email);
    }
    return url.toString();
  } catch {
    if (replacedUrl.startsWith('/') || replacedUrl.startsWith('#')) {
      return replacedUrl;
    }
    return null;
  }
}

export function buildGooglePkceVerifier(): string {
  return randomString(96);
}

export async function buildGooglePkceChallenge(
  verifier: string
): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

export async function buildSupabaseGoogleAuthorizeUrl(
  codeChallenge: string
): Promise<string> {
  const config = getSupabaseAuthConfig();
  if (!config?.supabaseUrl) {
    throw new Error('Riskcare Supabase URL is not configured');
  }

  const url = new URL('/auth/v1/authorize', config.supabaseUrl);
  url.searchParams.set('provider', 'google');
  url.searchParams.set('redirect_to', LOCAL_GOOGLE_AUTH_CALLBACK);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}
