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

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { generateUniqueId } from '@/lib';
import { useClinicalStore } from '@/store/clinicalStore';
import type { MedicalRecord } from '@/types/clinical';
import {
  Calendar,
  Download,
  Eye,
  File,
  FilePlus,
  FileText,
  Paperclip,
  Search,
  Trash2,
  User,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const RECORD_TYPES = [
  { value: 'consultation', label: 'Consulta', icon: FileText },
  { value: 'lab', label: 'Laboratorio', icon: File },
  { value: 'imaging', label: 'Imagenología', icon: File },
  { value: 'prescription', label: 'Prescripción', icon: FileText },
  { value: 'referral', label: 'Referencia', icon: FileText },
  { value: 'other', label: 'Otro', icon: File },
];

export function MedicalRecords(): JSX.Element {
  const {
    patients,
    medicalRecords,
    specialists,
    addMedicalRecord,
    updateMedicalRecord,
    deleteMedicalRecord,
    getPatientRecords,
  } = useClinicalStore();

  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<MedicalRecord | null>(
    null
  );
  const [formData, setFormData] = useState<Partial<MedicalRecord>>({
    patientId: '',
    type: 'consultation',
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    specialistId: '',
    attachments: [],
    metadata: {},
  });

  const selectedPatient = selectedPatientId
    ? patients[selectedPatientId]
    : null;
  const patientRecords = selectedPatientId
    ? getPatientRecords(selectedPatientId)
    : [];

  const filteredRecords = searchQuery
    ? patientRecords.filter(
        (record) =>
          record.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          record.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : patientRecords;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.patientId || !formData.title || !formData.description) {
      toast.error('Por favor complete los campos requeridos');
      return;
    }

    const recordData: MedicalRecord = {
      id: `record-${generateUniqueId()}`,
      patientId: formData.patientId!,
      type: formData.type || 'other',
      title: formData.title!,
      description: formData.description!,
      date: formData.date || new Date().toISOString().split('T')[0],
      specialistId: formData.specialistId,
      attachments: formData.attachments || [],
      metadata: formData.metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addMedicalRecord(recordData);
    toast.success('Registro médico creado correctamente');
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      patientId: selectedPatientId || '',
      type: 'consultation',
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      specialistId: '',
      attachments: [],
      metadata: {},
    });
    setIsDialogOpen(false);
  };

  const handleViewRecord = (record: MedicalRecord) => {
    setViewingRecord(record);
    setIsViewDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Está seguro de eliminar este registro?')) {
      deleteMedicalRecord(id);
      toast.success('Registro eliminado');
    }
  };

  const getRecordTypeLabel = (type: string) => {
    return RECORD_TYPES.find((t) => t.value === type)?.label || type;
  };

  const getRecordTypeIcon = (type: string) => {
    const RecordIcon = RECORD_TYPES.find((t) => t.value === type)?.icon || File;
    return <RecordIcon size={16} />;
  };

  return (
    <div className="bg-background flex h-full">
      <div className="border-border w-80 overflow-y-auto border-r p-4">
        <h2 className="mb-4 text-lg font-semibold">Seleccionar Paciente</h2>
        <div className="space-y-2">
          {Object.values(patients).map((patient) => (
            <Button
              key={patient.id}
              variant={selectedPatientId === patient.id ? 'default' : 'outline'}
              className="w-full justify-start text-left"
              onClick={() => setSelectedPatientId(patient.id)}
            >
              <User size={16} className="mr-2" />
              <div className="flex-1 truncate">
                <div className="font-medium">
                  {patient.firstName} {patient.lastName}
                </div>
                <div className="text-xs opacity-70">
                  {getPatientRecords(patient.id).length} registro(s)
                </div>
              </div>
            </Button>
          ))}
          {Object.keys(patients).length === 0 && (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No hay pacientes registrados
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6">
        {selectedPatient ? (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-foreground text-3xl font-bold">
                  Expediente: {selectedPatient.firstName}{' '}
                  {selectedPatient.lastName}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {patientRecords.length} registro(s) médico(s)
                </p>
              </div>
              <Button
                onClick={() => {
                  setFormData({ ...formData, patientId: selectedPatientId });
                  setIsDialogOpen(true);
                }}
                className="gap-2"
              >
                <FilePlus size={18} />
                Nuevo Registro
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
                  placeholder="Buscar en expediente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="space-y-3">
                {filteredRecords.map((record) => (
                  <Card
                    key={record.id}
                    className="p-4 transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          {getRecordTypeIcon(record.type)}
                          <h3 className="text-lg font-semibold">
                            {record.title}
                          </h3>
                          <Badge variant="outline" className="text-xs">
                            {getRecordTypeLabel(record.type)}
                          </Badge>
                        </div>

                        <p className="text-muted-foreground mb-3 line-clamp-2 text-sm">
                          {record.description}
                        </p>

                        <div className="text-muted-foreground flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1">
                            <Calendar size={12} />
                            <span>
                              {new Date(record.date).toLocaleDateString(
                                'es-ES'
                              )}
                            </span>
                          </div>
                          {record.specialistId &&
                            specialists[record.specialistId] && (
                              <div className="flex items-center gap-1">
                                <User size={12} />
                                <span>
                                  Dr(a).{' '}
                                  {specialists[record.specialistId].firstName}{' '}
                                  {specialists[record.specialistId].lastName}
                                </span>
                              </div>
                            )}
                          {record.attachments.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Paperclip size={12} />
                              <span>
                                {record.attachments.length} adjunto(s)
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="ml-4 flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewRecord(record)}
                        >
                          <Eye size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(record.id)}
                        >
                          <Trash2 size={16} className="text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {filteredRecords.length === 0 && (
                <div className="text-muted-foreground flex h-64 flex-col items-center justify-center">
                  <FileText size={48} className="mb-4 opacity-50" />
                  <p className="text-lg">No hay registros médicos</p>
                  <p className="text-sm">
                    Agregue un nuevo registro para este paciente
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-muted-foreground flex h-full flex-col items-center justify-center">
            <User size={64} className="mb-4 opacity-30" />
            <p className="text-xl">Seleccione un paciente</p>
            <p className="text-sm">
              Seleccione un paciente de la lista para ver su expediente
            </p>
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
              <h2 className="mb-6 text-2xl font-bold">Nuevo Registro Médico</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Tipo de Registro *
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          type: e.target.value as MedicalRecord['type'],
                        })
                      }
                      className="bg-background w-full rounded-md border px-3 py-2"
                      required
                    >
                      {RECORD_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Fecha *
                    </label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Título *
                  </label>
                  <Input
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Ej: Consulta General, Resultados de Laboratorio"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Descripción *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="bg-background min-h-[120px] w-full rounded-md border px-3 py-2"
                    placeholder="Describa los detalles del registro médico..."
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Especialista
                  </label>
                  <select
                    value={formData.specialistId}
                    onChange={(e) =>
                      setFormData({ ...formData, specialistId: e.target.value })
                    }
                    className="bg-background w-full rounded-md border px-3 py-2"
                  >
                    <option value="">Ninguno</option>
                    {Object.values(specialists).map((specialist) => (
                      <option key={specialist.id} value={specialist.id}>
                        Dr(a). {specialist.firstName} {specialist.lastName} -{' '}
                        {specialist.specialty}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.type === 'consultation' && (
                  <div className="bg-muted/30 grid grid-cols-2 gap-4 rounded-md p-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Diagnóstico
                      </label>
                      <Input
                        value={formData.metadata?.diagnosis || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            metadata: {
                              ...formData.metadata,
                              diagnosis: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Tratamiento
                      </label>
                      <Input
                        value={formData.metadata?.treatment || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            metadata: {
                              ...formData.metadata,
                              treatment: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit">Guardar Registro</Button>
                </div>
              </form>
            </div>
          </div>
        </Dialog>
      )}

      {isViewDialogOpen && viewingRecord && (
        <Dialog
          open={isViewDialogOpen}
          onOpenChange={(open) => !open && setIsViewDialogOpen(false)}
        >
          <div className="bg-black/50 fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-background max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg p-6 shadow-xl">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{viewingRecord.title}</h2>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="outline">
                      {getRecordTypeLabel(viewingRecord.type)}
                    </Badge>
                    <span className="text-muted-foreground text-sm">
                      {new Date(viewingRecord.date).toLocaleDateString(
                        'es-ES',
                        {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        }
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="mb-2 font-semibold">Descripción</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {viewingRecord.description}
                  </p>
                </div>

                {viewingRecord.specialistId &&
                  specialists[viewingRecord.specialistId] && (
                    <div>
                      <h3 className="mb-2 font-semibold">Especialista</h3>
                      <p className="text-muted-foreground">
                        Dr(a).{' '}
                        {specialists[viewingRecord.specialistId].firstName}{' '}
                        {specialists[viewingRecord.specialistId].lastName}
                        <br />
                        <span className="text-sm">
                          {specialists[viewingRecord.specialistId].specialty}
                        </span>
                      </p>
                    </div>
                  )}

                {viewingRecord.metadata?.diagnosis && (
                  <div>
                    <h3 className="mb-2 font-semibold">Diagnóstico</h3>
                    <p className="text-muted-foreground">
                      {viewingRecord.metadata.diagnosis}
                    </p>
                  </div>
                )}

                {viewingRecord.metadata?.treatment && (
                  <div>
                    <h3 className="mb-2 font-semibold">Tratamiento</h3>
                    <p className="text-muted-foreground">
                      {viewingRecord.metadata.treatment}
                    </p>
                  </div>
                )}

                {viewingRecord.attachments.length > 0 && (
                  <div>
                    <h3 className="mb-2 font-semibold">Adjuntos</h3>
                    <div className="space-y-2">
                      {viewingRecord.attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center justify-between rounded border p-2"
                        >
                          <div className="flex items-center gap-2">
                            <Paperclip size={16} />
                            <span className="text-sm">{attachment.name}</span>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Download size={16} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t pt-6">
                <Button
                  variant="outline"
                  onClick={() => setIsViewDialogOpen(false)}
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
