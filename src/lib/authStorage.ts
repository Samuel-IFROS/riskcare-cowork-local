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

type PersistedAuthState = {
  token?: string | null;
  email?: string | null;
  language?: string | null;
};

type PersistedAuthStorage = {
  state?: PersistedAuthState;
  version?: number;
};

function readAuthStorage(): PersistedAuthStorage | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem('auth-storage');
    if (!raw) return null;
    return JSON.parse(raw) as PersistedAuthStorage;
  } catch (_error) {
    return null;
  }
}

function writeAuthStorage(nextState: PersistedAuthState): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    const current = readAuthStorage();
    const payload: PersistedAuthStorage = {
      ...(current ?? {}),
      state: {
        ...(current?.state ?? {}),
        ...nextState,
      },
    };
    window.localStorage.setItem('auth-storage', JSON.stringify(payload));
  } catch (_error) {
    // no-op: invalid storage should not break app startup
  }
}

export function getStoredAuthState(): PersistedAuthState {
  return readAuthStorage()?.state ?? {};
}

export function getStoredAuthToken(): string | null {
  return getStoredAuthState().token ?? null;
}

export function getStoredAuthEmail(): string | null {
  return getStoredAuthState().email ?? null;
}

export function getStoredLanguage(): string | null {
  return getStoredAuthState().language ?? null;
}

export function setStoredLanguage(language: string): void {
  writeAuthStorage({ language });
}
