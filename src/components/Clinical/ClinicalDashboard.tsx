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
  loadClinicalSnapshot,
  saveClinicalSnapshot,
} from '@/service/clinicalSync';
import { useClinicalStore } from '@/store/clinicalStore';
import {
  Activity,
  BarChart3,
  Calendar,
  ChevronLeft,
  CloudDownload,
  CloudUpload,
  FolderOpen,
  ShieldCheck,
  Stethoscope,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AppointmentScheduler } from './AppointmentScheduler';
import { ClinicalConsentDialog } from './ClinicalConsentDialog';
import { MedicalRecords } from './MedicalRecords';
import { PatientManagement } from './PatientManagement';
import { SpecialistManagement } from './SpecialistManagement';

type ClinicalView =
  | 'overview'
  | 'patients'
  | 'specialists'
  | 'records'
  | 'appointments';

type ClinicalConsentAction = 'load' | 'save' | null;

export function ClinicalDashboard(): JSX.Element {
  const [currentView, setCurrentView] = useState<ClinicalView>('overview');
  const [consentAction, setConsentAction] =
    useState<ClinicalConsentAction>(null);
  const navigate = useNavigate();
  const {
    patients,
    specialists,
    medicalRecords,
    appointments,
    lastSyncedAt,
    pendingCloudChanges,
    isRemoteLoading,
    isRemoteSaving,
    cloudError,
    exportSnapshot,
    replaceSnapshot,
    setCloudError,
    setRemoteLoading,
    setRemoteSaving,
  } = useClinicalStore();

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

  const syncStatus = useMemo(() => {
    if (isRemoteLoading) {
      return 'Consultando datos clínicos en Supabase...';
    }
    if (isRemoteSaving) {
      return 'Subiendo cambios clínicos a Supabase...';
    }
    if (cloudError) {
      return cloudError;
    }
    if (pendingCloudChanges) {
      return 'Tienes cambios locales pendientes por subir.';
    }
    if (lastSyncedAt) {
      return `Última sincronización: ${new Date(lastSyncedAt).toLocaleString('es-CO')}`;
    }
    return 'Aún no se ha consultado Supabase en esta sesión.';
  }, [
    cloudError,
    isRemoteLoading,
    isRemoteSaving,
    lastSyncedAt,
    pendingCloudChanges,
  ]);

  const stats = useMemo(
    () => ({
      patients: Object.keys(patients).length,
      specialists: Object.values(specialists).filter((item) => item.isActive)
        .length,
      appointments: Object.keys(appointments).length,
      records: Object.keys(medicalRecords).length,
    }),
    [appointments, medicalRecords, patients, specialists]
  );

  const handleConsentConfirm = async () => {
    if (!consentAction) {
      return;
    }

    try {
      setCloudError(null);

      if (consentAction === 'load') {
        setRemoteLoading(true);
        const snapshot = await loadClinicalSnapshot();
        replaceSnapshot(snapshot);
        toast.success('Datos clínicos consultados desde Supabase');
      }

      if (consentAction === 'save') {
        setRemoteSaving(true);
        const snapshot = exportSnapshot();
        const savedSnapshot = await saveClinicalSnapshot(snapshot);
        replaceSnapshot(savedSnapshot);
        toast.success('Cambios clínicos sincronizados con Supabase');
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No fue posible sincronizar con Supabase';
      setCloudError(message);
      toast.error(message);
    } finally {
      setRemoteLoading(false);
      setRemoteSaving(false);
      setConsentAction(null);
    }
  };

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
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr,1fr]">
              <div className="from-primary/10 via-background to-background rounded-2xl border bg-gradient-to-br p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h1 className="text-foreground mb-2 text-3xl font-bold">
                      Sistema de Gestión Clínica
                    </h1>
                    <p className="text-muted-foreground max-w-2xl">
                      Administra pacientes, especialistas, expedientes y citas
                      con sincronización bajo permiso explícito antes de tocar
                      datos clínicos en Supabase.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => setConsentAction('load')}
                      disabled={isRemoteLoading || isRemoteSaving}
                    >
                      <CloudDownload size={16} />
                      Consultar desde Supabase
                    </Button>
                    <Button
                      className="gap-2"
                      onClick={() => setConsentAction('save')}
                      disabled={isRemoteLoading || isRemoteSaving}
                    >
                      <CloudUpload size={16} />
                      Subir a Supabase
                    </Button>
                  </div>
                </div>

                <div className="bg-background/90 mt-5 rounded-2xl border p-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 rounded-xl p-2">
                      <ShieldCheck size={18} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        Consentimiento clínico activo
                      </p>
                      <p className="text-muted-foreground mt-1 text-sm">
                        {syncStatus}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="bg-green-500/10 rounded-lg p-2">
                    <Activity size={20} className="text-green-500" />
                  </div>
                  <h3 className="text-lg font-semibold">Estado actual</h3>
                </div>
                <div className="space-y-3">
                  <div className="bg-muted/30 flex items-center justify-between rounded-lg p-3">
                    <span className="text-sm font-medium">Pacientes</span>
                    <span className="text-primary text-2xl font-bold">
                      {stats.patients}
                    </span>
                  </div>
                  <div className="bg-muted/30 flex items-center justify-between rounded-lg p-3">
                    <span className="text-sm font-medium">
                      Especialistas activos
                    </span>
                    <span className="text-primary text-2xl font-bold">
                      {stats.specialists}
                    </span>
                  </div>
                  <div className="bg-muted/30 flex items-center justify-between rounded-lg p-3">
                    <span className="text-sm font-medium">Citas</span>
                    <span className="text-primary text-2xl font-bold">
                      {stats.appointments}
                    </span>
                  </div>
                  <div className="bg-muted/30 flex items-center justify-between rounded-lg p-3">
                    <span className="text-sm font-medium">Expedientes</span>
                    <span className="text-primary text-2xl font-bold">
                      {stats.records}
                    </span>
                  </div>
                </div>
              </div>
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
                          'Registre y gestione información demográfica y clínica base.'}
                        {item.id === 'specialists' &&
                          'Administre profesionales, especialidades y disponibilidad.'}
                        {item.id === 'records' &&
                          'Consulte expedientes y adjuntos clínicos del paciente.'}
                        {item.id === 'appointments' &&
                          'Programe y supervise la agenda médica con visibilidad rápida.'}
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
                    Funcionalidades principales
                  </h3>
                </div>
                <ul className="text-muted-foreground space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">-</span>
                    <span>
                      Registro completo de pacientes con datos demográficos y
                      médicos.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">-</span>
                    <span>
                      Gestión de especialistas con disponibilidad y tiempos de
                      consulta.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">-</span>
                    <span>
                      Expedientes clínicos digitales con soporte para adjuntos.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">-</span>
                    <span>
                      Sincronización con Supabase solo después de permiso
                      explícito del usuario.
                    </span>
                  </li>
                </ul>
              </div>

              <div className="border-border bg-card rounded-lg border p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="bg-primary/10 rounded-lg p-2">
                    <ShieldCheck size={20} className="text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">Política de acceso</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="bg-muted/30 rounded-lg p-3">
                    Las consultas remotas no se hacen automáticamente al entrar
                    al módulo.
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    Cada consulta o subida a Supabase requiere autorización
                    previa desde este panel.
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    Los cambios que hagas en pacientes, citas y expedientes se
                    mantienen locales hasta que decidas sincronizarlos.
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <>
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
              Gestión Clínica
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
              <p className="mb-1 font-medium">RiskCare Clinical</p>
              <p>Sincronización protegida por consentimiento</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">{renderContent()}</div>
      </div>

      <ClinicalConsentDialog
        action={consentAction === 'save' ? 'save' : 'load'}
        open={consentAction !== null}
        isLoading={isRemoteLoading || isRemoteSaving}
        onCancel={() => setConsentAction(null)}
        onConfirm={() => void handleConsentConfirm()}
      />
    </>
  );
}
