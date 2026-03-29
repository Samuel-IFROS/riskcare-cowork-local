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

import type { ClinicalSnapshot } from '@/service/clinicalSync';
import type {
  Appointment,
  MedicalRecord,
  Patient,
  Specialist,
} from '@/types/clinical';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ClinicalStore {
  patients: Record<string, Patient>;
  specialists: Record<string, Specialist>;
  medicalRecords: Record<string, MedicalRecord>;
  appointments: Record<string, Appointment>;
  lastSyncedAt: string | null;
  pendingCloudChanges: boolean;
  isRemoteLoading: boolean;
  isRemoteSaving: boolean;
  cloudError: string | null;

  addPatient: (patient: Patient) => void;
  updatePatient: (id: string, patient: Partial<Patient>) => void;
  deletePatient: (id: string) => void;
  getPatient: (id: string) => Patient | undefined;
  searchPatients: (query: string) => Patient[];

  addSpecialist: (specialist: Specialist) => void;
  updateSpecialist: (id: string, specialist: Partial<Specialist>) => void;
  deleteSpecialist: (id: string) => void;
  getSpecialist: (id: string) => Specialist | undefined;

  addMedicalRecord: (record: MedicalRecord) => void;
  updateMedicalRecord: (id: string, record: Partial<MedicalRecord>) => void;
  deleteMedicalRecord: (id: string) => void;
  getPatientRecords: (patientId: string) => MedicalRecord[];

  addAppointment: (appointment: Appointment) => void;
  updateAppointment: (id: string, appointment: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;
  getPatientAppointments: (patientId: string) => Appointment[];
  getSpecialistAppointments: (specialistId: string) => Appointment[];

  replaceSnapshot: (snapshot: ClinicalSnapshot) => void;
  exportSnapshot: () => ClinicalSnapshot;
  markCloudSynced: (timestamp?: string) => void;
  markCloudDirty: () => void;
  setRemoteLoading: (value: boolean) => void;
  setRemoteSaving: (value: boolean) => void;
  setCloudError: (message: string | null) => void;
}

function toRecord<T extends { id: string }>(items: T[]): Record<string, T> {
  return items.reduce<Record<string, T>>((accumulator, item) => {
    accumulator[item.id] = item;
    return accumulator;
  }, {});
}

function nextUpdatedAt(): string {
  return new Date().toISOString();
}

export const useClinicalStore = create<ClinicalStore>()(
  persist(
    (set, get) => ({
      patients: {},
      specialists: {},
      medicalRecords: {},
      appointments: {},
      lastSyncedAt: null,
      pendingCloudChanges: false,
      isRemoteLoading: false,
      isRemoteSaving: false,
      cloudError: null,

      addPatient: (patient) =>
        set((state) => ({
          patients: { ...state.patients, [patient.id]: patient },
          pendingCloudChanges: true,
          cloudError: null,
        })),

      updatePatient: (id, updates) =>
        set((state) => ({
          patients: {
            ...state.patients,
            [id]: {
              ...state.patients[id],
              ...updates,
              updatedAt: nextUpdatedAt(),
            },
          },
          pendingCloudChanges: true,
          cloudError: null,
        })),

      deletePatient: (id) =>
        set((state) => {
          const { [id]: _deleted, ...rest } = state.patients;
          return {
            patients: rest,
            pendingCloudChanges: true,
            cloudError: null,
          };
        }),

      getPatient: (id) => get().patients[id],

      searchPatients: (query) => {
        const lowerQuery = query.toLowerCase();
        return Object.values(get().patients).filter(
          (patient) =>
            patient.firstName.toLowerCase().includes(lowerQuery) ||
            patient.lastName.toLowerCase().includes(lowerQuery) ||
            patient.contactPhone.includes(query)
        );
      },

      addSpecialist: (specialist) =>
        set((state) => ({
          specialists: { ...state.specialists, [specialist.id]: specialist },
          pendingCloudChanges: true,
          cloudError: null,
        })),

      updateSpecialist: (id, updates) =>
        set((state) => ({
          specialists: {
            ...state.specialists,
            [id]: {
              ...state.specialists[id],
              ...updates,
              updatedAt: nextUpdatedAt(),
            },
          },
          pendingCloudChanges: true,
          cloudError: null,
        })),

      deleteSpecialist: (id) =>
        set((state) => {
          const { [id]: _deleted, ...rest } = state.specialists;
          return {
            specialists: rest,
            pendingCloudChanges: true,
            cloudError: null,
          };
        }),

      getSpecialist: (id) => get().specialists[id],

      addMedicalRecord: (record) =>
        set((state) => ({
          medicalRecords: { ...state.medicalRecords, [record.id]: record },
          pendingCloudChanges: true,
          cloudError: null,
        })),

      updateMedicalRecord: (id, updates) =>
        set((state) => ({
          medicalRecords: {
            ...state.medicalRecords,
            [id]: {
              ...state.medicalRecords[id],
              ...updates,
              updatedAt: nextUpdatedAt(),
            },
          },
          pendingCloudChanges: true,
          cloudError: null,
        })),

      deleteMedicalRecord: (id) =>
        set((state) => {
          const { [id]: _deleted, ...rest } = state.medicalRecords;
          return {
            medicalRecords: rest,
            pendingCloudChanges: true,
            cloudError: null,
          };
        }),

      getPatientRecords: (patientId) =>
        Object.values(get().medicalRecords)
          .filter((record) => record.patientId === patientId)
          .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          ),

      addAppointment: (appointment) =>
        set((state) => ({
          appointments: {
            ...state.appointments,
            [appointment.id]: appointment,
          },
          pendingCloudChanges: true,
          cloudError: null,
        })),

      updateAppointment: (id, updates) =>
        set((state) => ({
          appointments: {
            ...state.appointments,
            [id]: {
              ...state.appointments[id],
              ...updates,
              updatedAt: nextUpdatedAt(),
            },
          },
          pendingCloudChanges: true,
          cloudError: null,
        })),

      deleteAppointment: (id) =>
        set((state) => {
          const { [id]: _deleted, ...rest } = state.appointments;
          return {
            appointments: rest,
            pendingCloudChanges: true,
            cloudError: null,
          };
        }),

      getPatientAppointments: (patientId) =>
        Object.values(get().appointments)
          .filter((appointment) => appointment.patientId === patientId)
          .sort(
            (a, b) =>
              new Date(`${a.date} ${a.time}`).getTime() -
              new Date(`${b.date} ${b.time}`).getTime()
          ),

      getSpecialistAppointments: (specialistId) =>
        Object.values(get().appointments)
          .filter((appointment) => appointment.specialistId === specialistId)
          .sort(
            (a, b) =>
              new Date(`${a.date} ${a.time}`).getTime() -
              new Date(`${b.date} ${b.time}`).getTime()
          ),

      replaceSnapshot: (snapshot) =>
        set({
          patients: toRecord(snapshot.patients),
          specialists: toRecord(snapshot.specialists),
          medicalRecords: toRecord(snapshot.medicalRecords),
          appointments: toRecord(snapshot.appointments),
          lastSyncedAt: nextUpdatedAt(),
          pendingCloudChanges: false,
          cloudError: null,
        }),

      exportSnapshot: () => ({
        patients: Object.values(get().patients),
        specialists: Object.values(get().specialists),
        medicalRecords: Object.values(get().medicalRecords),
        appointments: Object.values(get().appointments),
      }),

      markCloudSynced: (timestamp) =>
        set({
          lastSyncedAt: timestamp || nextUpdatedAt(),
          pendingCloudChanges: false,
          cloudError: null,
        }),

      markCloudDirty: () =>
        set({
          pendingCloudChanges: true,
        }),

      setRemoteLoading: (value) =>
        set({
          isRemoteLoading: value,
        }),

      setRemoteSaving: (value) =>
        set({
          isRemoteSaving: value,
        }),

      setCloudError: (message) =>
        set({
          cloudError: message,
        }),
    }),
    {
      name: 'clinical-storage',
      partialize: (state) => ({
        patients: state.patients,
        specialists: state.specialists,
        medicalRecords: state.medicalRecords,
        appointments: state.appointments,
        lastSyncedAt: state.lastSyncedAt,
        pendingCloudChanges: state.pendingCloudChanges,
      }),
    }
  )
);

export const getClinicalStore = () => useClinicalStore.getState();
