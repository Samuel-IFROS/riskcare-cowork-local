export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  bloodType?: string;
  allergies: string[];
  chronicConditions: string[];
  contactPhone: string;
  contactEmail?: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  address?: string;
  insuranceInfo?: {
    provider: string;
    policyNumber: string;
    validUntil: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Specialist {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
  licenseNumber: string;
  contactPhone: string;
  contactEmail: string;
  scheduleAvailability: {
    [day: string]: { start: string; end: string }[];
  };
  consultationDuration: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  type: 'consultation' | 'lab' | 'imaging' | 'prescription' | 'referral' | 'other';
  title: string;
  description: string;
  date: string;
  specialistId?: string;
  attachments: {
    id: string;
    name: string;
    type: string;
    url: string;
    size: number;
  }[];
  metadata?: {
    diagnosis?: string;
    treatment?: string;
    notes?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  specialistId: string;
  date: string;
  time: string;
  duration: number;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  reason: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
