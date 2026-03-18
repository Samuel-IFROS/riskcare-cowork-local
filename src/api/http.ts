// ========= Copyright 2025-2026 @ eigent.ai All Rights Reserved. =========
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
// ========= Copyright 2025-2026 @ eigent.ai All Rights Reserved. =========

import { showCreditsToast } from '@/components/Toast/creditsToast';
import { showStorageToast } from '@/components/Toast/storageToast';
import { showTrafficToast } from '@/components/Toast/trafficToast';
import { getStoredAuthToken } from '@/lib/authStorage';

const defaultHeaders = {
  'Content-Type': 'application/json',
};

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

let baseUrl = '';
export async function getBaseURL() {
  if (baseUrl) {
    return baseUrl;
  }
  const port = await window.ipcRenderer.invoke('get-backend-port');
  baseUrl = `http://localhost:${port}`;
  return baseUrl;
}

const isAbsoluteHttpUrl = (url: string) =>
  url.startsWith('http://') || url.startsWith('https://');

const stripApiPrefix = (url: string) => {
  if (url === '/api') return '/';
  if (url.startsWith('/api/')) return url.slice(4);
  return url;
};

const isLocalBackendBaseURL = async (baseURL: string): Promise<boolean> => {
  try {
    if (!window?.ipcRenderer?.invoke) return false;

    const parsed = new URL(baseURL);
    if (!LOCAL_HOSTNAMES.has(parsed.hostname)) return false;

    const backendPort = await window.ipcRenderer.invoke('get-backend-port');
    return Number(parsed.port) === Number(backendPort);
  } catch (_error) {
    return false;
  }
};

const normalizeProxyPath = async (
  baseURL: string,
  url: string
): Promise<string> => {
  if (isAbsoluteHttpUrl(url)) return url;
  if (!url.startsWith('/api')) return url;

  if (await isLocalBackendBaseURL(baseURL)) {
    return stripApiPrefix(url);
  }

  return url;
};

async function fetchRequest(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  data?: Record<string, any>,
  customHeaders: Record<string, string> = {}
): Promise<any> {
  const baseURL = await getBaseURL();
  const requestPath =
    isAbsoluteHttpUrl(url) || !url.startsWith('/api') ? url : stripApiPrefix(url);
  const fullUrl = isAbsoluteHttpUrl(requestPath)
    ? requestPath
    : `${baseURL}${requestPath}`;
  const token = getStoredAuthToken();

  const headers: Record<string, string> = {
    ...defaultHeaders,
    ...customHeaders,
  };

  // Cases without token: url is a complete http:// path
  if (!isAbsoluteHttpUrl(requestPath) && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (method === 'GET') {
    const query = data
      ? '?' +
        Object.entries(data)
          .map(
            ([key, val]) =>
              `${encodeURIComponent(key)}=${encodeURIComponent(val)}`
          )
          .join('&')
      : '';
    return handleResponse(fetch(fullUrl + query, options), data);
  }

  if (data) {
    options.body = JSON.stringify(data);
  }

  return handleResponse(fetch(fullUrl, options), data);
}

async function handleResponse(
  responsePromise: Promise<Response>,
  requestData?: Record<string, any>
): Promise<any> {
  try {
    const res = await responsePromise;
    if (res.status === 204) {
      return { code: 0, text: '' };
    }

    const contentType = res.headers.get('content-type') || '';
    if (res.body && !contentType.includes('application/json')) {
      return {
        isStream: true,
        body: res.body,
        reader: res.body.getReader(),
      };
    }
    const resData = await res.json();
    if (!resData) {
      return null;
    }
    const { code, text } = resData;
    // showCreditsToast()
    if (code === 1 || code === 300) {
      return resData;
    }

    if (code === 20) {
      showCreditsToast();
      return resData;
    }

    if (code === 21) {
      showStorageToast();
      return resData;
    }

    if (code === 13) {
      // const { logout } = getAuthStore()
      // logout()
      // window.location.href = '#/login'
      throw new Error(text);
    }

    return resData;
  } catch (err: any) {
    // Only show traffic toast for cloud model requests
    const isCloudRequest = requestData?.api_url === 'cloud';
    if (isCloudRequest) {
      showTrafficToast();
    }

    console.error('[fetch error]:', err);

    if (err?.response?.status === 401) {
      // const { logout } = getAuthStore()
      // logout()
      // window.location.href = '#/login'
    }

    throw err;
  }
}

// Encapsulate common methods
export const fetchGet = (url: string, params?: any, headers?: any) =>
  fetchRequest('GET', url, params, headers);

export const fetchPost = (url: string, data?: any, headers?: any) =>
  fetchRequest('POST', url, data, headers);

export const fetchPut = (url: string, data?: any, headers?: any) =>
  fetchRequest('PUT', url, data, headers);

export const fetchDelete = (url: string, data?: any, headers?: any) =>
  fetchRequest('DELETE', url, data, headers);

// =============== porxy ===============

// get proxy base URL
async function getProxyBaseURL() {
  const isDev = import.meta.env.DEV;

  if (isDev) {
    const proxyUrl = import.meta.env.VITE_PROXY_URL;
    if (!proxyUrl) {
      return 'http://localhost:3001';
    }
    return proxyUrl;
  } else {
    const baseUrl = import.meta.env.VITE_BASE_URL;
    if (!baseUrl) {
      throw new Error('VITE_BASE_URL not configured');
    }
    return baseUrl;
  }
}

async function proxyFetchRequest(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  data?: Record<string, any>,
  customHeaders: Record<string, string> = {}
): Promise<any> {
  const baseURL = await getProxyBaseURL();
  const requestPath = await normalizeProxyPath(baseURL, url);
  const fullUrl = isAbsoluteHttpUrl(requestPath)
    ? requestPath
    : `${baseURL}${requestPath}`;
  const token = getStoredAuthToken();

  const headers: Record<string, string> = {
    ...defaultHeaders,
    ...customHeaders,
  };

  if (!isAbsoluteHttpUrl(requestPath) && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (import.meta.env.DEV) {
    const targetUrl = import.meta.env.VITE_BASE_URL;
    if (targetUrl) {
      headers['X-Proxy-Target'] = targetUrl;
    }
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (method === 'GET') {
    const query = data
      ? '?' +
        Object.entries(data)
          .map(
            ([key, val]) =>
              `${encodeURIComponent(key)}=${encodeURIComponent(val)}`
          )
          .join('&')
      : '';
    return handleResponse(fetch(fullUrl + query, options));
  }

  if (data) {
    options.body = JSON.stringify(data);
  }

  return handleResponse(fetch(fullUrl, options));
}

export const proxyFetchGet = (url: string, params?: any, headers?: any) =>
  proxyFetchRequest('GET', url, params, headers);

export const proxyFetchPost = (url: string, data?: any, headers?: any) =>
  proxyFetchRequest('POST', url, data, headers);

export const proxyFetchPut = (url: string, data?: any, headers?: any) =>
  proxyFetchRequest('PUT', url, data, headers);

export const proxyFetchDelete = (url: string, data?: any, headers?: any) =>
  proxyFetchRequest('DELETE', url, data, headers);

// File upload function with FormData
export async function uploadFile(
  url: string,
  formData: FormData,
  headers?: Record<string, string>
): Promise<any> {
  const baseURL = await getProxyBaseURL();
  const requestPath = await normalizeProxyPath(baseURL, url);
  const fullUrl = isAbsoluteHttpUrl(requestPath)
    ? requestPath
    : `${baseURL}${requestPath}`;
  const token = getStoredAuthToken();

  const requestHeaders: Record<string, string> = {
    ...headers,
  };

  // Remove Content-Type header to let browser set it with boundary for FormData
  if (requestHeaders['Content-Type']) {
    delete requestHeaders['Content-Type'];
  }

  if (!isAbsoluteHttpUrl(requestPath) && token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  if (import.meta.env.DEV) {
    const targetUrl = import.meta.env.VITE_BASE_URL;
    if (targetUrl) {
      requestHeaders['X-Proxy-Target'] = targetUrl;
    }
  }

  const options: RequestInit = {
    method: 'POST',
    headers: requestHeaders,
    body: formData,
  };

  return handleResponse(fetch(fullUrl, options));
}

// =============== Backend Health Check ===============

/**
 * Check if backend is ready by checking the health endpoint
 * @returns Promise<boolean> - true if backend is ready, false otherwise
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const baseURL = await getBaseURL();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);

    const res = await fetch(`${baseURL}/health`, {
      signal: controller.signal,
      method: 'GET',
    });

    clearTimeout(timeoutId);
    return res.ok;
  } catch (error) {
    console.log('[Backend Health Check] Not ready:', error);
    return false;
  }
}

/**
 * Simple backend health check with retries
 * @param maxWaitMs - Maximum time to wait in milliseconds (default: 10000ms)
 * @param retryIntervalMs - Interval between retries in milliseconds (default: 500ms)
 * @returns Promise<boolean> - true if backend becomes ready, false if timeout
 */
export async function waitForBackendReady(
  maxWaitMs: number = 10000,
  retryIntervalMs: number = 500
): Promise<boolean> {
  const startTime = Date.now();
  console.log('[Backend Health Check] Waiting for backend to be ready...');

  while (Date.now() - startTime < maxWaitMs) {
    const isReady = await checkBackendHealth();

    if (isReady) {
      console.log(
        `[Backend Health Check] Backend is ready after ${Date.now() - startTime}ms`
      );
      return true;
    }

    console.log(
      `[Backend Health Check] Backend not ready, retrying... (${Date.now() - startTime}ms elapsed)`
    );
    await new Promise((resolve) => setTimeout(resolve, retryIntervalMs));
  }

  console.error(
    `[Backend Health Check] Backend failed to start within ${maxWaitMs}ms`
  );
  return false;
}


