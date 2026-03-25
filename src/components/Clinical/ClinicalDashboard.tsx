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
import {
  Activity,
  BarChart3,
  Calendar,
  ChevronLeft,
  FolderOpen,
  Stethoscope,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppointmentScheduler } from './AppointmentScheduler';
import { MedicalRecords } from './MedicalRecords';
import { PatientManagement } from './PatientManagement';
import { SpecialistManagement } from './SpecialistManagement';

type ClinicalView =
  | 'overview'
  | 'patients'
  | 'specialists'
  | 'records'
  | 'appointments';

export function ClinicalDashboard(): JSX.Element {
  const [currentView, setCurrentView] = useState<ClinicalView>('overview');
  const navigate = useNavigate();
  const goToWorkspaceHome = () => {
    setCurrentView('overview');
    navigate('/', { replace: true });
    if (window.location.hash !== '#/') {
      window.location.hash = '#/';
    }
  };

  const navigationItems = [
    { id: 'overview' as ClinicalView, label: 'Resumen', icon: Activity },
    { id: 'patients' as ClinicalView, label: 'Pacientes', icon: Users },
    {
      id: 'specialists' as ClinicalView,
      label: 'Especialistas',
      icon: Stethoscope,
    },
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
          <div className="space-y-6 p-6">
            <div>
              <h1 className="text-foreground mb-2 text-3xl font-bold">
                Sistema de Gestion Clinica
              </h1>
              <p className="text-muted-foreground">
                Bienvenido al modulo de gestion clinica de Riskcare
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {navigationItems
                .filter((item) => item.id !== 'overview')
                .map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentView(item.id)}
                      className="border-border bg-card group rounded-lg border p-6 text-left transition-all hover:shadow-lg"
                    >
                      <div className="mb-3 flex items-center gap-3">
                        <div className="bg-primary/10 group-hover:bg-primary/20 rounded-lg p-3 transition-colors">
                          <Icon size={24} className="text-primary" />
                        </div>
                      </div>
                      <h3 className="mb-2 text-xl font-semibold">
                        {item.label}
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        {item.id === 'patients' &&
                          'Registre y gestione informacion de pacientes'}
                        {item.id === 'specialists' &&
                          'Administre el personal medico y especialistas'}
                        {item.id === 'records' &&
                          'Visualice y organice expedientes clinicos'}
                        {item.id === 'appointments' &&
                          'Programe y gestione citas medicas'}
                      </p>
                    </button>
                  );
                })}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="border-border bg-card rounded-lg border p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="bg-blue-500/10 rounded-lg p-2">
                    <BarChart3 size={20} className="text-blue-500" />
                  </div>
                  <h3 className="text-lg font-semibold">
                    Funcionalidades Principales
                  </h3>
                </div>
                <ul className="text-muted-foreground space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">-</span>
                    <span>
                      Registro completo de pacientes con datos demograficos y
                      medicos
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">-</span>
                    <span>
                      Gestion de especialistas con horarios y disponibilidad
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">-</span>
                    <span>
                      Expedientes clinicos digitales con historial medico
                      completo
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">-</span>
                    <span>
                      Sistema de citas con calendario visual mensual y semanal
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">-</span>
                    <span>Busqueda y filtrado rapido de informacion</span>
                  </li>
                </ul>
              </div>

              <div className="border-border bg-card rounded-lg border p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="bg-green-500/10 rounded-lg p-2">
                    <Activity size={20} className="text-green-500" />
                  </div>
                  <h3 className="text-lg font-semibold">
                    Estadisticas Rapidas
                  </h3>
                </div>
                <div className="space-y-3">
                  <div className="bg-muted/30 flex items-center justify-between rounded-lg p-3">
                    <span className="text-sm font-medium">
                      Total de Pacientes
                    </span>
                    <span className="text-primary text-2xl font-bold">-</span>
                  </div>
                  <div className="bg-muted/30 flex items-center justify-between rounded-lg p-3">
                    <span className="text-sm font-medium">
                      Especialistas Activos
                    </span>
                    <span className="text-primary text-2xl font-bold">-</span>
                  </div>
                  <div className="bg-muted/30 flex items-center justify-between rounded-lg p-3">
                    <span className="text-sm font-medium">
                      Citas Programadas
                    </span>
                    <span className="text-primary text-2xl font-bold">-</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="bg-background flex h-full">
      <div className="border-border bg-card flex w-64 flex-col border-r">
        <div className="border-border border-b p-6">
          <Button
            variant="ghost"
            className="text-foreground h-auto w-full justify-start gap-2 px-0 py-0 text-xl font-bold hover:bg-transparent"
            onClick={goToWorkspaceHome}
          >
            <ChevronLeft size={20} className="text-muted-foreground" />
            <Stethoscope size={24} className="text-primary" />
            Gestion Clinica
          </Button>
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

        <div className="border-border border-t p-4">
          <div className="text-muted-foreground text-xs">
            <p className="mb-1 font-medium">Riskcare Clinical</p>
            <p>Sistema de Gestion Medica</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">{renderContent()}</div>
    </div>
  );
}
