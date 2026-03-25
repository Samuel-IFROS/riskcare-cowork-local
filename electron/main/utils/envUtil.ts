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

import fs from 'fs';
import os from 'os';
import path from 'path';

export const ENV_START = '# === MCP INTEGRATION ENV START ===';
export const ENV_END = '# === MCP INTEGRATION ENV END ===';
const EIGENT_DIR = path.join(os.homedir(), '.eigent');
const GLOBAL_ENV_PATH = path.join(EIGENT_DIR, '.env');

function ensureEigentDir() {
  if (!fs.existsSync(EIGENT_DIR)) {
    fs.mkdirSync(EIGENT_DIR, { recursive: true });
  }
}

function getDefaultEnvCandidates(): string[] {
  const candidates = [
    typeof process.resourcesPath === 'string'
      ? path.join(process.resourcesPath, 'backend', '.env')
      : null,
    typeof process.resourcesPath === 'string'
      ? path.join(process.resourcesPath, '.env')
      : null,
    path.join(process.cwd(), 'backend', '.env'),
    path.join(process.cwd(), '.env'),
  ].filter((candidate): candidate is string => Boolean(candidate));

  return [...new Set(candidates)].filter((candidate) =>
    fs.existsSync(candidate)
  );
}

function getBundledDefaultEnvPath(): string | null {
  return getDefaultEnvCandidates()[0] || null;
}

function readEnvKeyFromPath(filePath: string, key: string): string | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf-8');
    const prefix = key + '=';
    for (const line of content.split(/\r?\n/)) {
      if (line.startsWith(prefix)) {
        let value = line.slice(prefix.length).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        return value;
      }
    }
  } catch {
    // ignore read errors
  }
  return null;
}

function resolveBundledDefaultValue(...keys: string[]): string | null {
  const envFiles = getDefaultEnvCandidates();

  for (const key of keys) {
    const processValue = process.env[key]?.trim();
    if (processValue) {
      return processValue;
    }

    for (const envPath of envFiles) {
      const fileValue = readEnvKeyFromPath(envPath, key)?.trim();
      if (fileValue) {
        return fileValue;
      }
    }
  }

  return null;
}

export function getGlobalEnvPath() {
  ensureEigentDir();
  return GLOBAL_ENV_PATH;
}

export function getEnvPath(email: string) {
  const tempEmail = email
    .split('@')[0]
    .replace(/[\\/*?:"<>|\s]/g, '_')
    .replace('.', '_');
  const eigentDir = EIGENT_DIR;

  // Ensure .eigent directory exists
  ensureEigentDir();

  const envPath = path.join(eigentDir, '.env.' + tempEmail);
  const defaultEnv = getBundledDefaultEnvPath();
  if (!fs.existsSync(envPath) && defaultEnv && fs.existsSync(defaultEnv)) {
    fs.copyFileSync(defaultEnv, envPath);
    fs.chmodSync(envPath, 0o600);
  }

  return envPath;
}

export function parseEnvBlock(content: string) {
  const lines = content.split(/\r?\n/);
  let start = lines.findIndex((l) => l.trim() === ENV_START);
  let end = lines.findIndex((l) => l.trim() === ENV_END);
  if (start === -1) start = lines.length;
  if (end === -1) end = lines.length;
  return { lines, start, end };
}

export function updateEnvBlock(lines: string[], kv: Record<string, string>) {
  //  Extract block
  let start = lines.findIndex((l) => l.trim() === ENV_START);
  let end = lines.findIndex((l) => l.trim() === ENV_END);
  if (start === -1 || end === -1 || end < start) {
    //  No block, append
    lines.push(ENV_START);
    Object.entries(kv).forEach(([k, v]) => {
      lines.push(`${k}=${v}`);
    });
    lines.push(ENV_END);
    return lines;
  }
  //  Parse block content
  const block = lines.slice(start + 1, end);
  const map: Record<string, string> = {};
  block.forEach((line) => {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) map[m[1]] = m[2];
  });
  //  Overwrite/add
  Object.entries(kv).forEach(([k, v]) => {
    map[k] = v;
  });
  //  Reassemble block
  const newBlock = Object.entries(map).map(([k, v]) => `${k}=${v}`);
  return [...lines.slice(0, start + 1), ...newBlock, ...lines.slice(end)];
}

export function removeEnvKey(lines: string[], key: string) {
  let start = lines.findIndex((l) => l.trim() === ENV_START);
  let end = lines.findIndex((l) => l.trim() === ENV_END);
  if (start === -1 || end === -1 || end < start) return lines;
  const block = lines.slice(start + 1, end);
  const newBlock = block.filter((line) => !line.startsWith(key + '='));
  return [...lines.slice(0, start + 1), ...newBlock, ...lines.slice(end)];
}

/**
 * Read the value of a key from the global ~/.eigent/.env file.
 */
export function readGlobalEnvKey(key: string): string | null {
  try {
    const globalEnvPath = getGlobalEnvPath();
    if (!fs.existsSync(globalEnvPath)) return null;
    return readEnvKeyFromPath(globalEnvPath, key);
  } catch {
    // ignore read errors
  }
  return null;
}

export function ensureGlobalEnvDefaults(
  defaults: Record<string, string | null | undefined>
) {
  const envPath = getGlobalEnvPath();
  const lines = fs.existsSync(envPath)
    ? fs.readFileSync(envPath, 'utf-8').split(/\r?\n/)
    : [];
  let changed = false;

  Object.entries(defaults).forEach(([key, value]) => {
    const normalizedValue = value?.trim();
    if (!normalizedValue) {
      return;
    }

    const existingValue = readEnvKeyFromPath(envPath, key)?.trim();
    if (existingValue) {
      return;
    }

    const prefix = key + '=';
    const existingIndex = lines.findIndex((line) => line.startsWith(prefix));
    if (existingIndex >= 0) {
      lines[existingIndex] = `${key}=${normalizedValue}`;
    } else {
      lines.push(`${key}=${normalizedValue}`);
    }
    changed = true;
  });

  if (!changed) {
    return;
  }

  const nextContent = `${lines.filter(Boolean).join('\n')}\n`;
  fs.writeFileSync(envPath, nextContent, 'utf-8');
  try {
    fs.chmodSync(envPath, 0o600);
  } catch {
    // ignore chmod issues on platforms that don't support it
  }
}

export function ensureRiskcareRuntimeDefaults() {
  ensureGlobalEnvDefaults({
    OPENAI_API_KEY: resolveBundledDefaultValue(
      'RISKCARE_DEFAULT_CLOUD_API_KEY',
      'OPENAI_API_KEY'
    ),
    OPENAI_API_BASE_URL: resolveBundledDefaultValue(
      'RISKCARE_DEFAULT_CLOUD_BASE_URL',
      'OPENAI_API_BASE_URL'
    ),
    RISKCARE_PROFILE_URL: resolveBundledDefaultValue('RISKCARE_PROFILE_URL'),
    RISKCARE_SUPABASE_URL: resolveBundledDefaultValue('RISKCARE_SUPABASE_URL'),
    RISKCARE_SUPABASE_PUBLISHABLE_KEY: resolveBundledDefaultValue(
      'RISKCARE_SUPABASE_PUBLISHABLE_KEY'
    ),
  });
}

/**
 * Mask credentials in a proxy URL for safe logging.
 * e.g. "http://user:pass@host:port" → "http://***:***@host:port"
 */
export function maskProxyUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) {
      parsed.username = '***';
      parsed.password = '***';
      return parsed.toString();
    }
  } catch {
    // not a valid URL, return as-is
  }
  return url;
}

export function getEmailFolderPath(email: string) {
  const tempEmail = email
    .split('@')[0]
    .replace(/[\\/*?:"<>|\s]/g, '_')
    .replace('.', '_');
  const MCP_CONFIG_DIR = path.join(os.homedir(), '.eigent');
  const MCP_REMOTE_CONFIG_DIR = path.join(MCP_CONFIG_DIR, tempEmail);
  if (!fs.existsSync(MCP_REMOTE_CONFIG_DIR)) {
    fs.mkdirSync(MCP_REMOTE_CONFIG_DIR, { recursive: true });
  }
  const mcpRemoteDir = path.join(MCP_REMOTE_CONFIG_DIR, 'mcp-remote-0.1.22');
  let hasToken = false;
  try {
    const tokenFile = fs
      .readdirSync(mcpRemoteDir)
      .find((file) => file.includes('token'));
    if (tokenFile) {
      console.log('tokenFile', tokenFile);
      hasToken = true;
    } else {
      hasToken = false;
    }
  } catch (_error) {
    hasToken = false;
  }

  return { MCP_REMOTE_CONFIG_DIR, MCP_CONFIG_DIR, tempEmail, hasToken };
}
