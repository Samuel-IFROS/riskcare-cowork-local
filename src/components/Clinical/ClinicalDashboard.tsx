import { useState } from 'react';
import { PatientManagement } from './PatientManagement';
import { SpecialistManagement } from './SpecialistManagement';
import { MedicalRecords } from './MedicalRecords';
import { AppointmentScheduler } from './AppointmentScheduler';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Stethoscope, 
  FolderOpen, 
  Calendar,
  Activity,
  BarChart3
} from 'lucide-react';

type ClinicalView = 'overview' | 'patients' | 'specialists' | 'records' | 'appointments';

export function ClinicalDashboard(): JSX.Element {
  const [currentView, setCurrentView] = useState<ClinicalView>('overview');

  const navigationItems = [
    { id: 'overview' as ClinicalView, label: 'Resumen', icon: Activity },
    { id: 'patients' as ClinicalView, label: 'Pacientes', icon: Users },
    { id: 'specialists' as ClinicalView, label: 'Especialistas', icon: Stethoscope },
    { id: 'records' as ClinicalView, label: 'Expedientes', icon: FolderOpen },
    { id: 'appointments' as ClinicalView, label: 'Citas', icon: Calendar },
  ];

  const renderContent = () => {
    switch (currentView) {
      case 'patients':
        return <PatientManagement />;
      case 'specialists':
        return <SpecialistManagement />;
      case 'records':
        return <MedicalRecords />;
      case 'appointments':
        return <AppointmentScheduler />;
      case 'overview':
      default:
        return (
          <div className="p-6 space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Sistema de Gestión Clínica</h1>
              <p className="text-muted-foreground">Bienvenido al módulo de gestión clínica de Riskcare</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {navigationItems.filter(item => item.id !== 'overview').map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id)}
                    className="p-6 bg-card border border-border rounded-lg hover:shadow-lg transition-all text-left group"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                        <Icon size={24} className="text-primary" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{item.label}</h3>
                    <p className="text-sm text-muted-foreground">
                      {item.id === 'patients' && 'Registre y gestione información de pacientes'}
                      {item.id === 'specialists' && 'Administre el personal médico y especialistas'}
                      {item.id === 'records' && 'Visualice y organice expedientes clínicos'}
                      {item.id === 'appointments' && 'Programe y gestione citas médicas'}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 bg-card border border-border rounded-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <BarChart3 size={20} className="text-blue-500" />
                  </div>
                  <h3 className="text-lg font-semibold">Funcionalidades Principales</h3>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Registro completo de pacientes con datos demográficos y médicos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Gestión de especialistas con horarios y disponibilidad</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Expedientes clínicos digitales con historial médico completo</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Sistema de citas con calendario visual mensual y semanal</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Búsqueda y filtrado rápido de información</span>
                  </li>
                </ul>
              </div>

              <div className="p-6 bg-card border border-border rounded-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Activity size={20} className="text-green-500" />
                  </div>
                  <h3 className="text-lg font-semibold">Estadísticas Rápidas</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm font-medium">Total de Pacientes</span>
                    <span className="text-2xl font-bold text-primary">-</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm font-medium">Especialistas Activos</span>
                    <span className="text-2xl font-bold text-primary">-</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm font-medium">Citas Programadas</span>
                    <span className="text-2xl font-bold text-primary">-</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-full bg-background">
      <div className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Stethoscope size={24} className="text-primary" />
            Gestión Clínica
          </h2>
        </div>
        
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              
              return (
                <Button
                  key={item.id}
                  variant={isActive ? 'default' : 'ghost'}
                  className="w-full justify-start gap-3"
                  onClick={() => setCurrentView(item.id)}
                >
                  <Icon size={18} />
                  {item.label}
                </Button>
              );
            })}
          </div>
        </nav>

        <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-1">Riskcare Clinical</p>
            <p>Sistema de Gestión Médica</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
}
