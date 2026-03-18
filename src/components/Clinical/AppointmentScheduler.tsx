import { useState } from 'react';
import { useClinicalStore } from '@/store/clinicalStore';
import type { Appointment } from '@/types/clinical';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CalendarPlus, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  scheduled: { label: 'Programada', color: 'bg-blue-500', icon: Clock },
  confirmed: { label: 'Confirmada', color: 'bg-green-500', icon: CheckCircle2 },
  completed: { label: 'Completada', color: 'bg-gray-500', icon: CheckCircle2 },
  cancelled: { label: 'Cancelada', color: 'bg-red-500', icon: XCircle },
  'no-show': { label: 'No asistió', color: 'bg-orange-500', icon: AlertCircle },
};

export function AppointmentScheduler(): JSX.Element {
  const { 
    appointments, 
    patients, 
    specialists,
    addAppointment, 
    updateAppointment, 
    deleteAppointment 
  } = useClinicalStore();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('week');
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<Partial<Appointment>>({
    patientId: '',
    specialistId: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    duration: 30,
    status: 'scheduled',
    reason: '',
    notes: ''
  });

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getWeekDates = (date: Date) => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    const week = [];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      week.push(d);
    }
    
    return week;
  };

  const getAppointmentsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return Object.values(appointments).filter(apt => apt.date === dateString);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.patientId || !formData.specialistId || !formData.reason) {
      toast.error('Por favor complete los campos requeridos');
      return;
    }

    const appointmentData: Appointment = {
      id: editingAppointment?.id || `appointment-${Date.now()}`,
      patientId: formData.patientId!,
      specialistId: formData.specialistId!,
      date: formData.date || new Date().toISOString().split('T')[0],
      time: formData.time || '09:00',
      duration: formData.duration || 30,
      status: formData.status || 'scheduled',
      reason: formData.reason!,
      notes: formData.notes,
      createdAt: editingAppointment?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingAppointment) {
      updateAppointment(editingAppointment.id, appointmentData);
      toast.success('Cita actualizada correctamente');
    } else {
      addAppointment(appointmentData);
      toast.success('Cita programada correctamente');
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      patientId: '',
      specialistId: '',
      date: new Date().toISOString().split('T')[0],
      time: '09:00',
      duration: 30,
      status: 'scheduled',
      reason: '',
      notes: ''
    });
    setEditingAppointment(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setFormData(appointment);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Está seguro de eliminar esta cita?')) {
      deleteAppointment(id);
      toast.success('Cita eliminada');
    }
  };

  const changeMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + direction)));
  };

  const changeWeek = (direction: number) => {
    setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + (direction * 7))));
  };

  const renderMonthView = () => {
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
    const days = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="min-h-24 border border-border/50" />);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayAppointments = getAppointmentsForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();
      
      days.push(
        <div
          key={day}
          className={`min-h-24 border border-border/50 p-2 ${isToday ? 'bg-primary/10' : ''}`}
        >
          <div className="font-semibold text-sm mb-1">{day}</div>
          <div className="space-y-1">
            {dayAppointments.slice(0, 3).map(apt => (
              <div
                key={apt.id}
                className={`text-xs p-1 rounded cursor-pointer ${STATUS_CONFIG[apt.status].color} text-white`}
                onClick={() => handleEdit(apt)}
              >
                {apt.time} - {patients[apt.patientId]?.firstName}
              </div>
            ))}
            {dayAppointments.length > 3 && (
              <div className="text-xs text-muted-foreground">+{dayAppointments.length - 3} más</div>
            )}
          </div>
        </div>
      );
    }
    
    return days;
  };

  const renderWeekView = () => {
    const weekDates = getWeekDates(new Date(currentDate));
    const hours = Array.from({ length: 14 }, (_, i) => i + 7);
    
    return (
      <div className="grid grid-cols-8 border-t border-l border-border">
        <div className="border-r border-border bg-muted/30"></div>
        {weekDates.map((date, idx) => (
          <div key={idx} className="border-r border-border p-2 text-center bg-muted/30">
            <div className="font-semibold">{date.toLocaleDateString('es-ES', { weekday: 'short' })}</div>
            <div className="text-sm text-muted-foreground">{date.getDate()}</div>
          </div>
        ))}
        
        {hours.map(hour => (
          <div key={hour} className="contents">
            <div className="border-r border-b border-border p-2 text-sm text-muted-foreground bg-muted/20">
              {hour}:00
            </div>
            {weekDates.map((date, idx) => {
              const dateString = date.toISOString().split('T')[0];
              const hourAppointments = Object.values(appointments).filter(apt => {
                if (apt.date !== dateString) return false;
                const aptHour = parseInt(apt.time.split(':')[0]);
                return aptHour === hour;
              });
              
              return (
                <div key={`${hour}-${idx}`} className="border-r border-b border-border p-1 min-h-16">
                  {hourAppointments.map(apt => {
                    const StatusIcon = STATUS_CONFIG[apt.status].icon;
                    return (
                      <div
                        key={apt.id}
                        className={`text-xs p-2 rounded mb-1 cursor-pointer ${STATUS_CONFIG[apt.status].color} text-white`}
                        onClick={() => handleEdit(apt)}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          <StatusIcon size={12} />
                          <span className="font-semibold">{apt.time}</span>
                        </div>
                        <div className="truncate">
                          {patients[apt.patientId]?.firstName} {patients[apt.patientId]?.lastName}
                        </div>
                        <div className="truncate text-xs opacity-90">
                          {specialists[apt.specialistId]?.specialty}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-background p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-foreground">Programación de Citas</h1>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('month')}
            >
              Mes
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('week')}
            >
              Semana
            </Button>
          </div>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <CalendarPlus size={18} />
          Nueva Cita
        </Button>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => viewMode === 'month' ? changeMonth(-1) : changeWeek(-1)}
          >
            <ChevronLeft size={18} />
          </Button>
          <h2 className="text-xl font-semibold">
            {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => viewMode === 'month' ? changeMonth(1) : changeWeek(1)}
          >
            <ChevronRight size={18} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Hoy
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {Object.entries(STATUS_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <div key={key} className="flex items-center gap-1 text-xs">
                <div className={`w-3 h-3 rounded ${config.color}`} />
                <span>{config.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-auto border rounded-lg">
        {viewMode === 'month' ? (
          <div className="grid grid-cols-7 h-full">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
              <div key={day} className="border-b border-r border-border bg-muted/50 p-2 text-center font-semibold text-sm">
                {day}
              </div>
            ))}
            {renderMonthView()}
          </div>
        ) : (
          renderWeekView()
        )}
      </div>

      {isDialogOpen && (
        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && resetForm()}>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <h2 className="text-2xl font-bold mb-6">
                {editingAppointment ? 'Editar Cita' : 'Nueva Cita'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Paciente *</label>
                  <select
                    value={formData.patientId}
                    onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    required
                  >
                    <option value="">Seleccione un paciente</option>
                    {Object.values(patients).map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.firstName} {patient.lastName} - {patient.contactPhone}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Especialista *</label>
                  <select
                    value={formData.specialistId}
                    onChange={(e) => setFormData({ ...formData, specialistId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    required
                  >
                    <option value="">Seleccione un especialista</option>
                    {Object.values(specialists).filter(s => s.isActive).map((specialist) => (
                      <option key={specialist.id} value={specialist.id}>
                        Dr(a). {specialist.firstName} {specialist.lastName} - {specialist.specialty}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Fecha *</label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Hora *</label>
                    <Input
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Duración (min)</label>
                    <Input
                      type="number"
                      min="15"
                      step="15"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Estado</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Appointment['status'] })}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  >
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Motivo de la Cita *</label>
                  <Input
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Ej: Consulta general, Control, etc."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Notas</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background min-h-[80px]"
                    placeholder="Notas adicionales..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  {editingAppointment && (
                    <Button
                      type="button"
                      variant="outline"
                      className="text-destructive"
                      onClick={() => {
                        handleDelete(editingAppointment.id);
                        resetForm();
                      }}
                    >
                      Eliminar
                    </Button>
                  )}
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingAppointment ? 'Actualizar' : 'Programar'}
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
