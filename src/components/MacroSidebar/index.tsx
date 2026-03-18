// ========= Copyright 2025-2026 @ eigent.ai All Rights Reserved. =========
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
// ========= Copyright 2025-2026 @ eigent.ai All Rights Reserved. =========

import { fetchDelete, fetchGet, fetchPost, fetchPut } from '@/api/http';
import useChatStoreAdapter from '@/hooks/useChatStoreAdapter';
import { Pencil, Play, RefreshCcw, Stethoscope, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

type ClinicalShortcut = {
  id: string;
  label: string;
  description: string;
  prompt: string;
};

const CLINICAL_SHORTCUTS: ClinicalShortcut[] = [
  {
    id: 'triage',
    label: 'Triage rapido',
    description: 'Prioriza riesgo y define el nivel de urgencia.',
    prompt:
      'Actua como apoyo de triaje clinico. Organiza sintomas, signos de alarma y prioridad (emergencia, urgente o programable). Si faltan datos, pide la informacion faltante antes de concluir.',
  },
  {
    id: 'agenda',
    label: 'Agendar atencion',
    description: 'Prepara checklist para cita y preconsulta.',
    prompt:
      'Actua como coordinador de clinica. Crea un plan de atencion con especialidad sugerida, estudios previos, documentos requeridos y tareas administrativas para agendar cita.',
  },
  {
    id: 'soap',
    label: 'Nota SOAP',
    description: 'Genera evolucion en formato clinico estructurado.',
    prompt:
      'Genera una nota clinica en formato SOAP (Subjetivo, Objetivo, Analisis y Plan) para seguimiento medico. Usa lenguaje profesional y separa claramente hallazgos, evaluacion y plan.',
  },
  {
    id: 'rx',
    label: 'Plan terapeutico',
    description: 'Borrador de indicaciones y advertencias de seguridad.',
    prompt:
      'Propone un plan terapeutico preliminar con objetivos, alternativas, advertencias de seguridad y monitoreo. No inventes dosis exactas si no hay datos suficientes; marca supuestos y validaciones pendientes.',
  },
  {
    id: 'referencia',
    label: 'Referencia medica',
    description: 'Carta para remision a especialista o centro.',
    prompt:
      'Redacta una referencia medica clara para especialista o centro de mayor complejidad. Incluye motivo de referencia, resumen clinico, examenes relevantes y prioridad de derivacion.',
  },
];

export function MacroSidebar(): JSX.Element {
  const { chatStore, projectStore } = useChatStoreAdapter();
  const [recordings, setRecordings] = useState<string[]>([]);
  const [selectedRecording, setSelectedRecording] = useState('');
  const [renameDraft, setRenameDraft] = useState('');
  const [replaySpeed, setReplaySpeed] = useState('1');
  const [replayRepeat, setReplayRepeat] = useState('1');
  const [selectedClinicalShortcut, setSelectedClinicalShortcut] = useState(
    CLINICAL_SHORTCUTS[0].id
  );
  const [clinicalContext, setClinicalContext] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const selectRecording = useCallback((name: string) => {
    setSelectedRecording(name);
    setRenameDraft(name);
  }, []);

  const loadRecordings = useCallback(
    async (preferredRecording?: string) => {
      try {
        const res = await fetchGet('/automation/recordings');
        const list = Array.isArray(res?.recordings) ? res.recordings : [];
        setRecordings(list);

        let nextSelection = '';
        if (preferredRecording && list.includes(preferredRecording)) {
          nextSelection = preferredRecording;
        } else if (selectedRecording && list.includes(selectedRecording)) {
          nextSelection = selectedRecording;
        } else if (list.length > 0) {
          nextSelection = list[0];
        }

        if (nextSelection) {
          selectRecording(nextSelection);
        } else {
          setSelectedRecording('');
          setRenameDraft('');
        }
      } catch (error) {
        console.error('Failed to load recordings:', error);
        setRecordings([]);
        setSelectedRecording('');
        setRenameDraft('');
      }
    },
    [selectRecording, selectedRecording]
  );

  useEffect(() => {
    void loadRecordings();
  }, [loadRecordings]);

  const handleReplay = useCallback(
    async (recordingName?: string) => {
      const targetName = (recordingName || selectedRecording).trim();
      const speed = Number(replaySpeed);
      const repeat = Number(replayRepeat);

      if (!targetName) {
        toast.error('Selecciona una macro para ejecutar');
        return;
      }
      if (!Number.isFinite(speed) || speed <= 0) {
        toast.error('La velocidad debe ser mayor que 0');
        return;
      }
      if (!Number.isInteger(repeat) || repeat < 1) {
        toast.error(
          'Las repeticiones deben ser un numero entero mayor o igual a 1'
        );
        return;
      }

      try {
        setIsBusy(true);
        const res = await fetchPost('/automation/replay', {
          recording_name: targetName,
          speed_multiplier: speed,
          repeat_count: repeat,
          initial_delay_seconds: 1,
        });
        if (res?.success) {
          toast.success(res?.message || 'Macro ejecutada');
        } else {
          toast.error(res?.message || 'No se pudo ejecutar la macro');
        }
      } catch (error: any) {
        console.error('Failed to replay macro:', error);
        toast.error(error?.message || 'Error ejecutando macro');
      } finally {
        setIsBusy(false);
      }
    },
    [selectedRecording, replaySpeed, replayRepeat]
  );

  const handleRename = useCallback(async () => {
    const sourceName = selectedRecording.trim();
    const targetName = renameDraft.trim();

    if (!sourceName) {
      toast.error('Selecciona una macro para editar');
      return;
    }
    if (!targetName) {
      toast.error('Ingresa un nuevo nombre');
      return;
    }
    if (sourceName === targetName) {
      toast.error('El nuevo nombre debe ser diferente');
      return;
    }

    try {
      setIsBusy(true);
      const res = await fetchPut('/automation/recording/rename', {
        old_name: sourceName,
        new_name: targetName,
      });
      if (res?.success) {
        toast.success(res?.message || 'Macro actualizada');
        await loadRecordings(targetName);
      } else {
        toast.error(res?.message || 'No se pudo editar la macro');
      }
    } catch (error: any) {
      console.error('Failed to rename macro:', error);
      toast.error(error?.message || 'Error editando macro');
    } finally {
      setIsBusy(false);
    }
  }, [selectedRecording, renameDraft, loadRecordings]);

  const handleDelete = useCallback(
    async (recordingName?: string) => {
      const targetName = (recordingName || selectedRecording).trim();
      if (!targetName) {
        toast.error('Selecciona una macro para borrar');
        return;
      }

      const accepted = window.confirm(
        `Se borrara la macro "${targetName}". Deseas continuar?`
      );
      if (!accepted) return;

      try {
        setIsBusy(true);
        const encodedName = encodeURIComponent(targetName);
        const res = await fetchDelete(`/automation/recording/${encodedName}`);
        if (res?.success) {
          toast.success(res?.message || 'Macro eliminada');
          await loadRecordings();
        } else {
          toast.error(res?.message || 'No se pudo borrar la macro');
        }
      } catch (error: any) {
        console.error('Failed to delete macro:', error);
        toast.error(error?.message || 'Error borrando macro');
      } finally {
        setIsBusy(false);
      }
    },
    [selectedRecording, loadRecordings]
  );

  const handleRunClinicalShortcut = useCallback(async () => {
    const targetShortcut = CLINICAL_SHORTCUTS.find(
      (item) => item.id === selectedClinicalShortcut
    );

    if (!targetShortcut) {
      toast.error('Selecciona una funcion clinica valida');
      return;
    }

    try {
      setIsBusy(true);
      if (!projectStore.activeProjectId) {
        projectStore.createProject('Atencion medica');
      }

      const baseTaskId = chatStore.activeTaskId || chatStore.create();
      const caseContext = clinicalContext.trim() || 'Sin datos adicionales.';
      const clinicalPrompt = `${targetShortcut.prompt}

Contexto del caso:
${caseContext}

Responde en espanol y usa este formato:
1) Resumen clinico
2) Datos faltantes
3) Siguiente paso recomendado
4) Alertas de seguridad`;

      await chatStore.startTask(
        baseTaskId,
        undefined,
        undefined,
        undefined,
        clinicalPrompt,
        []
      );
      toast.success(`Funcion clinica iniciada: ${targetShortcut.label}`);
      setClinicalContext('');
    } catch (error: any) {
      console.error('Failed to start clinical shortcut:', error);
      toast.error(error?.message || 'No se pudo iniciar la funcion clinica');
    } finally {
      setIsBusy(false);
    }
  }, [chatStore, clinicalContext, projectStore, selectedClinicalShortcut]);

  const activeShortcut =
    CLINICAL_SHORTCUTS.find((item) => item.id === selectedClinicalShortcut) ||
    CLINICAL_SHORTCUTS[0];

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-solid border-input-border-default bg-input-bg-default">
      <div className="flex items-center justify-between border-b border-solid border-input-border-default px-3 py-3">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-text-heading">
            Lista de macros
          </span>
          <span className="text-xs text-text-label">
            Ejecutar, editar y borrar
          </span>
        </div>
        <button
          type="button"
          onClick={() => void loadRecordings()}
          disabled={isBusy}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-label transition-all hover:bg-white-100% hover:text-text-body disabled:opacity-40"
          title="Actualizar lista"
        >
          <RefreshCcw size={15} />
        </button>
      </div>

      <div className="scrollbar flex-1 space-y-2 overflow-y-auto p-3">
        {recordings.length === 0 && (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-input-border-default px-3 py-5 text-center text-xs font-medium text-text-label">
            No hay macros guardadas
          </div>
        )}
        {recordings.map((recording) => (
          <div
            key={recording}
            className={`group flex items-center justify-between rounded-lg border border-solid px-2 py-2 transition-all ${
              selectedRecording === recording
                ? 'border-input-border-focus bg-input-bg-input'
                : 'border-input-border-default bg-input-bg-default'
            }`}
          >
            <button
              type="button"
              className="mr-2 flex-1 truncate text-left text-sm font-semibold text-text-body"
              onClick={() => selectRecording(recording)}
              disabled={isBusy}
            >
              {recording}
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-label transition-all hover:bg-white-100% hover:text-text-body disabled:opacity-40"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleReplay(recording);
                }}
                disabled={isBusy}
                title="Ejecutar macro"
              >
                <Play size={14} />
              </button>
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-label transition-all hover:bg-white-100% hover:text-text-body disabled:opacity-40"
                onClick={(e) => {
                  e.stopPropagation();
                  selectRecording(recording);
                }}
                disabled={isBusy}
                title="Editar nombre"
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-label transition-all hover:bg-white-100% hover:text-status-error disabled:opacity-40"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleDelete(recording);
                }}
                disabled={isBusy}
                title="Borrar macro"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="scrollbar max-h-[58%] space-y-3 overflow-y-auto border-t border-solid border-input-border-default p-3">
        <div className="text-xs font-semibold text-text-heading">
          Editar macro seleccionada
        </div>
        <div className="flex gap-2">
          <input
            value={renameDraft}
            onChange={(e) => setRenameDraft(e.target.value)}
            disabled={isBusy || !selectedRecording}
            placeholder="Nuevo nombre"
            className="h-9 flex-1 rounded-md border border-solid border-input-border-default bg-input-bg-default px-2 text-xs text-text-body outline-none transition-all focus:border-input-border-focus disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => void handleRename()}
            disabled={isBusy || !selectedRecording}
            className="h-9 rounded-md bg-button-primary-bg-default px-3 text-xs font-semibold text-button-primary-text-default transition-all hover:bg-button-primary-bg-hover disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={replaySpeed}
            onChange={(e) => setReplaySpeed(e.target.value)}
            disabled={isBusy}
            placeholder="Velocidad x"
            className="h-9 rounded-md border border-solid border-input-border-default bg-input-bg-default px-2 text-xs text-text-body outline-none transition-all focus:border-input-border-focus disabled:opacity-50"
          />
          <input
            type="number"
            min="1"
            step="1"
            value={replayRepeat}
            onChange={(e) => setReplayRepeat(e.target.value)}
            disabled={isBusy}
            placeholder="Repeticiones"
            className="h-9 rounded-md border border-solid border-input-border-default bg-input-bg-default px-2 text-xs text-text-body outline-none transition-all focus:border-input-border-focus disabled:opacity-50"
          />
        </div>
        <button
          type="button"
          onClick={() => void handleReplay()}
          disabled={isBusy || !selectedRecording}
          className="h-9 w-full rounded-md bg-button-primary-bg-default px-3 text-xs font-semibold text-button-primary-text-default transition-all hover:bg-button-primary-bg-hover disabled:opacity-50"
        >
          {isBusy
            ? 'Procesando...'
            : `Ejecutar ${selectedRecording || 'macro seleccionada'}`}
        </button>

        <div className="space-y-2 rounded-lg border border-solid border-input-border-default bg-input-bg-input p-2">
          <div className="flex items-center gap-2">
            <Stethoscope size={14} className="text-text-label" />
            <span className="text-xs font-semibold text-text-heading">
              Funciones clinicas IA
            </span>
          </div>
          <p className="text-[11px] leading-4 text-text-label">
            Plantillas para trabajo de clinica y atencion medica.
          </p>
          <div className="grid grid-cols-1 gap-2">
            {CLINICAL_SHORTCUTS.map((shortcut) => (
              <button
                key={shortcut.id}
                type="button"
                onClick={() => setSelectedClinicalShortcut(shortcut.id)}
                disabled={isBusy}
                className={`rounded-md border border-solid px-2 py-2 text-left transition-all disabled:opacity-50 ${
                  selectedClinicalShortcut === shortcut.id
                    ? 'border-input-border-focus bg-input-bg-default'
                    : 'border-input-border-default bg-transparent hover:bg-input-bg-default'
                }`}
              >
                <span className="block text-xs font-semibold text-text-body">
                  {shortcut.label}
                </span>
                <span className="mt-1 block text-[11px] leading-4 text-text-label">
                  {shortcut.description}
                </span>
              </button>
            ))}
          </div>
          <div className="rounded-md border border-dashed border-input-border-default px-2 py-2 text-[11px] leading-4 text-text-label">
            {activeShortcut.description}
          </div>
          <textarea
            value={clinicalContext}
            onChange={(e) => setClinicalContext(e.target.value)}
            disabled={isBusy}
            rows={4}
            placeholder="Contexto del paciente (edad, sintomas, antecedentes, motivo de consulta, etc.)"
            className="scrollbar w-full resize-y rounded-md border border-solid border-input-border-default bg-input-bg-default px-2 py-2 text-xs text-text-body outline-none transition-all focus:border-input-border-focus disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => void handleRunClinicalShortcut()}
            disabled={isBusy}
            className="h-9 w-full rounded-md bg-button-primary-bg-default px-3 text-xs font-semibold text-button-primary-text-default transition-all hover:bg-button-primary-bg-hover disabled:opacity-50"
          >
            {isBusy ? 'Procesando...' : `Lanzar ${activeShortcut.label}`}
          </button>
        </div>
      </div>
    </div>
  );
}
