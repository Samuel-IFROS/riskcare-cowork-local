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

import { fetchGet, fetchPut } from '@/api/http';
import type {
  Appointment,
  MedicalRecord,
  Patient,
  Specialist,
} from '@/types/clinical';

export interface ClinicalSnapshot {
  patients: Patient[];
  specialists: Specialist[];
  medicalRecords: MedicalRecord[];
  appointments: Appointment[];
}

type ClinicalSnapshotResponse = ClinicalSnapshot & {
  code: number;
  text?: string;
};

function normalizeSnapshotResponse(
  response: ClinicalSnapshotResponse
): ClinicalSnapshot {
  if (response.code !== 0) {
    throw new Error(response.text || 'Clinical sync request failed');
  }

  return {
    patients: Array.isArray(response.patients) ? response.patients : [],
    specialists: Array.isArray(response.specialists)
      ? response.specialists
      : [],
    medicalRecords: Array.isArray(response.medicalRecords)
      ? response.medicalRecords
      : [],
    appointments: Array.isArray(response.appointments)
      ? response.appointments
      : [],
  };
}

export async function loadClinicalSnapshot(): Promise<ClinicalSnapshot> {
  const response = (await fetchGet(
    '/clinical/snapshot'
  )) as ClinicalSnapshotResponse;
  return normalizeSnapshotResponse(response);
}

export async function saveClinicalSnapshot(
  snapshot: ClinicalSnapshot
): Promise<ClinicalSnapshot> {
  const response = (await fetchPut(
    '/clinical/snapshot',
    snapshot
  )) as ClinicalSnapshotResponse;
  return normalizeSnapshotResponse(response);
}
