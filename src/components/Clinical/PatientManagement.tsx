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

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { generateUniqueId } from '@/lib';
import { useClinicalStore } from '@/store/clinicalStore';
import type { Patient } from '@/types/clinical';
import {
  AlertCircle,
  Calendar,
  Edit2,
  FileText,
  Mail,
  Phone,
  Search,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function PatientManagement(): JSX.Element {
  const { patients, addPatient, updatePatient, deletePatient, searchPatients } =
    useClinicalStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [formData, setFormData] = useState<Partial<Patient>>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'other',
    contactPhone: '',
    contactEmail: '',
    allergies: [],
    chronicConditions: [],
    emergencyContact: {
      name: '',
      phone: '',
      relationship: '',
    },
  });

  const filteredPatients = searchQuery
    ? searchPatients(searchQuery)
    : Object.values(patients);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName || !formData.lastName || !formData.contactPhone) {
      toast.error('Por favor complete los campos requeridos');
      return;
    }

    const patientData: Patient = {
      id: editingPatient?.id || `patient-${generateUniqueId()}`,
      firstName: formData.firstName!,
      lastName: formData.lastName!,
      dateOfBirth: formData.dateOfBirth || '',
      gender: formData.gender || 'other',
      bloodType: formData.bloodType,
      allergies: formData.allergies || [],
      chronicConditions: formData.chronicConditions || [],
      contactPhone: formData.contactPhone!,
      contactEmail: formData.contactEmail,
      emergencyContact: formData.emergencyContact || {
        name: '',
        phone: '',
        relationship: '',
      },
      address: formData.address,
      insuranceInfo: formData.insuranceInfo,
      createdAt: editingPatient?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingPatient) {
      updatePatient(editingPatient.id, patientData);
      toast.success('Paciente actualizado correctamente');
    } else {
      addPatient(patientData);
      toast.success('Paciente registrado correctamente');
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: 'other',
      contactPhone: '',
      contactEmail: '',
      allergies: [],
      chronicConditions: [],
      emergencyContact: { name: '', phone: '', relationship: '' },
    });
    setEditingPatient(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setFormData(patient);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Está seguro de eliminar este paciente?')) {
      deletePatient(id);
      toast.success('Paciente eliminado');
    }
  };

  const calculateAge = (dateOfBirth: string): number => {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  return (
    <div className="bg-background flex h-full flex-col p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-3xl font-bold">
            Gestión de Pacientes
          </h1>
          <p className="text-muted-foreground mt-1">
            {Object.keys(patients).length} paciente(s) registrado(s)
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <UserPlus size={18} />
          Nuevo Paciente
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search
            className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 transform"
            size={18}
          />
          <Input
            type="text"
            placeholder="Buscar por nombre o teléfono..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPatients.map((patient) => (
            <Card
              key={patient.id}
              className="p-4 transition-shadow hover:shadow-lg"
            >
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <h3 className="text-foreground text-lg font-semibold">
                    {patient.firstName} {patient.lastName}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {patient.dateOfBirth &&
                      `${calculateAge(patient.dateOfBirth)} años`}
                    {patient.gender &&
                      ` • ${patient.gender === 'male' ? 'M' : patient.gender === 'female' ? 'F' : 'Otro'}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(patient)}
                  >
                    <Edit2 size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(patient.id)}
                  >
                    <Trash2 size={16} className="text-destructive" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="text-muted-foreground flex items-center gap-2">
                  <Phone size={14} />
                  <span>{patient.contactPhone}</span>
                </div>
                {patient.contactEmail && (
                  <div className="text-muted-foreground flex items-center gap-2">
                    <Mail size={14} />
                    <span>{patient.contactEmail}</span>
                  </div>
                )}
                {patient.allergies.length > 0 && (
                  <div className="flex items-start gap-2 text-amber-600 dark:text-amber-500">
                    <AlertCircle size={14} className="mt-0.5" />
                    <span>Alergias: {patient.allergies.join(', ')}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 gap-2">
                  <FileText size={14} />
                  Expediente
                </Button>
                <Button variant="outline" size="sm" className="flex-1 gap-2">
                  <Calendar size={14} />
                  Citas
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {filteredPatients.length === 0 && (
          <div className="text-muted-foreground flex h-64 flex-col items-center justify-center">
            <UserPlus size={48} className="mb-4 opacity-50" />
            <p className="text-lg">No se encontraron pacientes</p>
            <p className="text-sm">Registre un nuevo paciente para comenzar</p>
          </div>
        )}
      </div>

      {isDialogOpen && (
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => !open && resetForm()}
        >
          <div className="bg-black/50 fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-background max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg p-6 shadow-xl">
              <h2 className="mb-6 text-2xl font-bold">
                {editingPatient ? 'Editar Paciente' : 'Nuevo Paciente'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Nombre *
                    </label>
                    <Input
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Apellidos *
                    </label>
                    <Input
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Fecha de Nacimiento
                    </label>
                    <Input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          dateOfBirth: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Sexo
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          gender: e.target.value as Patient['gender'],
                        })
                      }
                      className="bg-background w-full rounded-md border px-3 py-2"
                    >
                      <option value="male">Masculino</option>
                      <option value="female">Femenino</option>
                      <option value="other">Otro</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Teléfono *
                    </label>
                    <Input
                      type="tel"
                      value={formData.contactPhone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contactPhone: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contactEmail: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Tipo de Sangre
                  </label>
                  <Input
                    value={formData.bloodType}
                    onChange={(e) =>
                      setFormData({ ...formData, bloodType: e.target.value })
                    }
                    placeholder="Ej: O+, A-, AB+"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Alergias (separadas por coma)
                  </label>
                  <Input
                    value={formData.allergies?.join(', ')}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        allergies: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="Ej: Penicilina, Polen"
                  />
                </div>

                <div className="border-t pt-4">
                  <h3 className="mb-3 font-medium">Contacto de Emergencia</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Nombre
                      </label>
                      <Input
                        value={formData.emergencyContact?.name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            emergencyContact: {
                              ...formData.emergencyContact!,
                              name: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Teléfono
                      </label>
                      <Input
                        type="tel"
                        value={formData.emergencyContact?.phone}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            emergencyContact: {
                              ...formData.emergencyContact!,
                              phone: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Parentesco
                      </label>
                      <Input
                        value={formData.emergencyContact?.relationship}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            emergencyContact: {
                              ...formData.emergencyContact!,
                              relationship: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingPatient ? 'Actualizar' : 'Registrar'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
