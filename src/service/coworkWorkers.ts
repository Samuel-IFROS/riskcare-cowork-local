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

import { getBaseURL } from '@/api/http';

const COWORK_WORKERS_ENDPOINT = '/workers';

type WorkersResponse = {
  code: number;
  items?: Agent[];
  text?: string;
};

function normalizeWorkers(response: WorkersResponse): Agent[] {
  if (response.code !== 0) {
    throw new Error(response.text || 'Workers request failed');
  }
  return Array.isArray(response.items) ? response.items : [];
}

export async function loadCoworkWorkers(token: string): Promise<Agent[]> {
  if (!token) return [];

  const baseUrl = await getBaseURL();
  const response = await fetch(`${baseUrl}${COWORK_WORKERS_ENDPOINT}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  const json = (await response.json()) as WorkersResponse;
  return normalizeWorkers(json);
}

export async function saveCoworkWorkers(
  token: string,
  workers: Agent[]
): Promise<Agent[]> {
  if (!token) return workers;

  const baseUrl = await getBaseURL();
  const response = await fetch(`${baseUrl}${COWORK_WORKERS_ENDPOINT}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ workers }),
  });
  const json = (await response.json()) as WorkersResponse;
  return normalizeWorkers(json);
}
