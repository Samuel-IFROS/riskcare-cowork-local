import { useState } from 'react';
import { useClinicalStore } from '@/store/clinicalStore';
import type { Specialist } from '@/types/clinical';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  UserPlus, 
  Search, 
  Edit2, 
  Trash2, 
  Calendar,
  Phone,
  Mail,
  Award,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

const SPECIALTIES = [
  'Medicina General',
  'Cardiología',
  'Pediatría',
  'Ginecología',
  'Traumatología',
  'Dermatología',
  'Neurología',
  'Psiquiatría',
  'Oftalmología',
  'Otorrinolaringología',
  'Urología',
  'Endocrinología',
  'Gastroenterología',
  'Neumología',
  'Oncología',
  'Otro'
];

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function SpecialistManagement(): JSX.Element {
  const { specialists, addSpecialist, updateSpecialist, deleteSpecialist } = useClinicalStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSpecialist, setEditingSpecialist] = useState<Specialist | null>(null);
  const [formData, setFormData] = useState<Partial<Specialist>>({
    firstName: '',
    lastName: '',
    specialty: '',
    licenseNumber: '',
    contactPhone: '',
    contactEmail: '',
    consultationDuration: 30,
    scheduleAvailability: {},
    isActive: true
  });

  const filteredSpecialists = Object.values(specialists).filter(
    (specialist) =>
      specialist.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      specialist.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      specialist.specialty.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.specialty || !formData.licenseNumber || !formData.contactPhone) {
      toast.error('Por favor complete los campos requeridos');
      return;
    }

    const specialistData: Specialist = {
      id: editingSpecialist?.id || `specialist-${Date.now()}`,
      firstName: formData.firstName!,
      lastName: formData.lastName!,
      specialty: formData.specialty!,
      licenseNumber: formData.licenseNumber!,
      contactPhone: formData.contactPhone!,
      contactEmail: formData.contactEmail || '',
      consultationDuration: formData.consultationDuration || 30,
      scheduleAvailability: formData.scheduleAvailability || {},
      isActive: formData.isActive !== undefined ? formData.isActive : true,
      createdAt: editingSpecialist?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingSpecialist) {
      updateSpecialist(editingSpecialist.id, specialistData);
      toast.success('Especialista actualizado correctamente');
    } else {
      addSpecialist(specialistData);
      toast.success('Especialista registrado correctamente');
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      specialty: '',
      licenseNumber: '',
      contactPhone: '',
      contactEmail: '',
      consultationDuration: 30,
      scheduleAvailability: {},
      isActive: true
    });
    setEditingSpecialist(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (specialist: Specialist) => {
    setEditingSpecialist(specialist);
    setFormData(specialist);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Está seguro de eliminar este especialista?')) {
      deleteSpecialist(id);
      toast.success('Especialista eliminado');
    }
  };

  return (
    <div className="h-full flex flex-col bg-background p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestión de Especialistas</h1>
          <p className="text-muted-foreground mt-1">
            {Object.keys(specialists).length} especialista(s) registrado(s)
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <UserPlus size={18} />
          Nuevo Especialista
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            type="text"
            placeholder="Buscar por nombre o especialidad..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSpecialists.map((specialist) => (
            <Card key={specialist.id} className="p-4 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      Dr(a). {specialist.firstName} {specialist.lastName}
                    </h3>
                    {specialist.isActive ? (
                      <Badge variant="default" className="text-xs">Activo</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Inactivo</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Award size={14} />
                    {specialist.specialty}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(specialist)}>
                    <Edit2 size={16} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(specialist.id)}>
                    <Trash2 size={16} className="text-destructive" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone size={14} />
                  <span>{specialist.contactPhone}</span>
                </div>
                {specialist.contactEmail && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail size={14} />
                    <span className="truncate">{specialist.contactEmail}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock size={14} />
                  <span>Consulta: {specialist.consultationDuration} min</span>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Cédula: {specialist.licenseNumber}
                </div>
              </div>

              <div className="mt-4">
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <Calendar size={14} />
                  Ver Agenda
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {filteredSpecialists.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <UserPlus size={48} className="mb-4 opacity-50" />
            <p className="text-lg">No se encontraron especialistas</p>
            <p className="text-sm">Registre un nuevo especialista para comenzar</p>
          </div>
        )}
      </div>

      {isDialogOpen && (
        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && resetForm()}>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <h2 className="text-2xl font-bold mb-6">
                {editingSpecialist ? 'Editar Especialista' : 'Nuevo Especialista'}
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
                    <label className="block text-sm font-medium mb-1">Especialidad *</label>
                    <select
                      value={formData.specialty}
                      onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md bg-background"
                      required
                    >
                      <option value="">Seleccione...</option>
                      {SPECIALTIES.map((spec) => (
                        <option key={spec} value={spec}>{spec}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Cédula Profesional *</label>
                    <Input
                      value={formData.licenseNumber}
                      onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                      required
                    />
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Duración de Consulta (minutos)</label>
                    <Input
                      type="number"
                      min="15"
                      step="15"
                      value={formData.consultationDuration}
                      onChange={(e) => setFormData({ ...formData, consultationDuration: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-medium">Especialista Activo</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingSpecialist ? 'Actualizar' : 'Registrar'}
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
