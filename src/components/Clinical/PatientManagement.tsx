import { useState } from 'react';
import { useClinicalStore } from '@/store/clinicalStore';
import type { Patient } from '@/types/clinical';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { 
  UserPlus, 
  Search, 
  Edit2, 
  Trash2, 
  FileText, 
  Calendar,
  Phone,
  Mail,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

export function PatientManagement(): JSX.Element {
  const { patients, addPatient, updatePatient, deletePatient, searchPatients } = useClinicalStore();
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
      relationship: ''
    }
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
      id: editingPatient?.id || `patient-${Date.now()}`,
      firstName: formData.firstName!,
      lastName: formData.lastName!,
      dateOfBirth: formData.dateOfBirth || '',
      gender: formData.gender || 'other',
      bloodType: formData.bloodType,
      allergies: formData.allergies || [],
      chronicConditions: formData.chronicConditions || [],
      contactPhone: formData.contactPhone!,
      contactEmail: formData.contactEmail,
      emergencyContact: formData.emergencyContact || { name: '', phone: '', relationship: '' },
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
      emergencyContact: { name: '', phone: '', relationship: '' }
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
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="h-full flex flex-col bg-background p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestión de Pacientes</h1>
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
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.map((patient) => (
            <Card key={patient.id} className="p-4 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {patient.firstName} {patient.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {patient.dateOfBirth && `${calculateAge(patient.dateOfBirth)} años`}
                    {patient.gender && ` • ${patient.gender === 'male' ? 'M' : patient.gender === 'female' ? 'F' : 'Otro'}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(patient)}>
                    <Edit2 size={16} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(patient.id)}>
                    <Trash2 size={16} className="text-destructive" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone size={14} />
                  <span>{patient.contactPhone}</span>
                </div>
                {patient.contactEmail && (
                  <div className="flex items-center gap-2 text-muted-foreground">
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

              <div className="flex gap-2 mt-4">
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
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <UserPlus size={48} className="mb-4 opacity-50" />
            <p className="text-lg">No se encontraron pacientes</p>
            <p className="text-sm">Registre un nuevo paciente para comenzar</p>
          </div>
        )}
      </div>

      {isDialogOpen && (
        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && resetForm()}>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <h2 className="text-2xl font-bold mb-6">
                {editingPatient ? 'Editar Paciente' : 'Nuevo Paciente'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nombre *</label>
                    <Input
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Apellidos *</label>
                    <Input
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Fecha de Nacimiento</label>
                    <Input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Sexo</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value as Patient['gender'] })}
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    >
                      <option value="male">Masculino</option>
                      <option value="female">Femenino</option>
                      <option value="other">Otro</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Teléfono *</label>
                    <Input
                      type="tel"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <Input
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Tipo de Sangre</label>
                  <Input
                    value={formData.bloodType}
                    onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })}
                    placeholder="Ej: O+, A-, AB+"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Alergias (separadas por coma)</label>
                  <Input
                    value={formData.allergies?.join(', ')}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      allergies: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                    placeholder="Ej: Penicilina, Polen"
                  />
                </div>

                <div className="pt-4 border-t">
                  <h3 className="font-medium mb-3">Contacto de Emergencia</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Nombre</label>
                      <Input
                        value={formData.emergencyContact?.name}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          emergencyContact: { ...formData.emergencyContact!, name: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Teléfono</label>
                      <Input
                        type="tel"
                        value={formData.emergencyContact?.phone}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          emergencyContact: { ...formData.emergencyContact!, phone: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Parentesco</label>
                      <Input
                        value={formData.emergencyContact?.relationship}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          emergencyContact: { ...formData.emergencyContact!, relationship: e.target.value }
                        })}
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
