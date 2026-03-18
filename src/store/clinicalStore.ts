import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Patient, Specialist, MedicalRecord, Appointment } from '@/types/clinical';

interface ClinicalStore {
  patients: Record<string, Patient>;
  specialists: Record<string, Specialist>;
  medicalRecords: Record<string, MedicalRecord>;
  appointments: Record<string, Appointment>;
  
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
}

export const useClinicalStore = create<ClinicalStore>()(
  persist(
    (set, get) => ({
      patients: {},
      specialists: {},
      medicalRecords: {},
      appointments: {},
      
      addPatient: (patient) =>
        set((state) => ({
          patients: { ...state.patients, [patient.id]: patient },
        })),
        
      updatePatient: (id, updates) =>
        set((state) => ({
          patients: {
            ...state.patients,
            [id]: { ...state.patients[id], ...updates, updatedAt: new Date().toISOString() },
          },
        })),
        
      deletePatient: (id) =>
        set((state) => {
          const { [id]: _, ...rest } = state.patients;
          return { patients: rest };
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
        })),
        
      updateSpecialist: (id, updates) =>
        set((state) => ({
          specialists: {
            ...state.specialists,
            [id]: { ...state.specialists[id], ...updates, updatedAt: new Date().toISOString() },
          },
        })),
        
      deleteSpecialist: (id) =>
        set((state) => {
          const { [id]: _, ...rest } = state.specialists;
          return { specialists: rest };
        }),
        
      getSpecialist: (id) => get().specialists[id],
      
      addMedicalRecord: (record) =>
        set((state) => ({
          medicalRecords: { ...state.medicalRecords, [record.id]: record },
        })),
        
      updateMedicalRecord: (id, updates) =>
        set((state) => ({
          medicalRecords: {
            ...state.medicalRecords,
            [id]: { ...state.medicalRecords[id], ...updates, updatedAt: new Date().toISOString() },
          },
        })),
        
      deleteMedicalRecord: (id) =>
        set((state) => {
          const { [id]: _, ...rest } = state.medicalRecords;
          return { medicalRecords: rest };
        }),
        
      getPatientRecords: (patientId) =>
        Object.values(get().medicalRecords)
          .filter((record) => record.patientId === patientId)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      
      addAppointment: (appointment) =>
        set((state) => ({
          appointments: { ...state.appointments, [appointment.id]: appointment },
        })),
        
      updateAppointment: (id, updates) =>
        set((state) => ({
          appointments: {
            ...state.appointments,
            [id]: { ...state.appointments[id], ...updates, updatedAt: new Date().toISOString() },
          },
        })),
        
      deleteAppointment: (id) =>
        set((state) => {
          const { [id]: _, ...rest } = state.appointments;
          return { appointments: rest };
        }),
        
      getPatientAppointments: (patientId) =>
        Object.values(get().appointments)
          .filter((apt) => apt.patientId === patientId)
          .sort((a, b) => new Date(a.date + ' ' + a.time).getTime() - new Date(b.date + ' ' + b.time).getTime()),
      
      getSpecialistAppointments: (specialistId) =>
        Object.values(get().appointments)
          .filter((apt) => apt.specialistId === specialistId)
          .sort((a, b) => new Date(a.date + ' ' + a.time).getTime() - new Date(b.date + ' ' + b.time).getTime()),
    }),
    {
      name: 'clinical-storage',
    }
  )
);

export const getClinicalStore = () => useClinicalStore.getState();
