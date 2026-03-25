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

import {
  FileHeart,
  HeartPulse,
  Microscope,
  ShieldPlus,
  Stethoscope,
} from 'lucide-react';
import type { ReactNode } from 'react';

export type WorkflowAgentType =
  | 'developer_agent'
  | 'browser_agent'
  | 'document_agent'
  | 'multi_modal_agent'
  | 'social_media_agent';

export interface AgentDisplayInfo {
  name: string;
  icon: ReactNode;
  textColor: string;
  bgColor: string;
  shapeColor: string;
  borderColor: string;
  bgColorLight: string;
  toolkitLabels: string[];
  previewTitle: string;
  previewHint: string;
}

export const agentMap: Record<WorkflowAgentType, AgentDisplayInfo> = {
  developer_agent: {
    name: 'Triage Clinico',
    icon: <Stethoscope size={16} className="text-current" />,
    textColor: 'text-emerald-200',
    bgColor: 'bg-emerald-500/15',
    shapeColor: 'bg-emerald-300/25',
    borderColor: 'border-emerald-400/35',
    bgColorLight: 'bg-emerald-500/15',
    toolkitLabels: [
      '# Protocolos de ingreso',
      '# Priorizacion medica',
      '# Ruta de atencion',
    ],
    previewTitle: 'Ruta de evaluacion',
    previewHint: 'Checklist inicial y criterios de prioridad',
  },
  browser_agent: {
    name: 'Monitoreo Clinico',
    icon: <HeartPulse size={16} className="text-current" />,
    textColor: 'text-cyan-200',
    bgColor: 'bg-cyan-500/15',
    shapeColor: 'bg-cyan-300/25',
    borderColor: 'border-cyan-400/35',
    bgColorLight: 'bg-cyan-500/15',
    toolkitLabels: [
      '# Signos vitales',
      '# Seguimiento en sala',
      '# Alertas clinicas',
    ],
    previewTitle: 'Panel de observacion',
    previewHint: 'Monitoreo continuo de casos y eventos',
  },
  document_agent: {
    name: 'Expediente Clinico',
    icon: <FileHeart size={16} className="text-current" />,
    textColor: 'text-amber-100',
    bgColor: 'bg-amber-500/15',
    shapeColor: 'bg-amber-300/25',
    borderColor: 'border-amber-400/35',
    bgColorLight: 'bg-amber-500/15',
    toolkitLabels: [
      '# Evolucion medica',
      '# Ordenes y notas',
      '# Alta y seguimiento',
    ],
    previewTitle: 'Resumen del expediente',
    previewHint: 'Notas estructuradas y documentos del paciente',
  },
  multi_modal_agent: {
    name: 'Imagenologia IA',
    icon: <Microscope size={16} className="text-current" />,
    textColor: 'text-rose-200',
    bgColor: 'bg-rose-500/15',
    shapeColor: 'bg-rose-300/25',
    borderColor: 'border-rose-400/35',
    bgColorLight: 'bg-rose-500/15',
    toolkitLabels: [
      '# Imagenes diagnosticas',
      '# Hallazgos visuales',
      '# Evidencia clinica',
    ],
    previewTitle: 'Sala de analisis',
    previewHint: 'Exploracion multimodal para apoyo diagnostico',
  },
  social_media_agent: {
    name: 'Coordinacion Preventiva',
    icon: <ShieldPlus size={16} className="text-current" />,
    textColor: 'text-violet-200',
    bgColor: 'bg-violet-500/15',
    shapeColor: 'bg-violet-300/25',
    borderColor: 'border-violet-400/35',
    bgColorLight: 'bg-violet-500/15',
    toolkitLabels: [
      '# Educacion al paciente',
      '# Campanas de prevencion',
      '# Avisos y recordatorios',
    ],
    previewTitle: 'Comunicacion segura',
    previewHint: 'Mensajeria y acciones de prevencion asistida',
  },
};

/** Ordered list of workflow agents (id + name + icon) for use in skill scope and elsewhere. */
export const WORKFLOW_AGENT_LIST: {
  id: WorkflowAgentType;
  name: string;
  icon: ReactNode;
}[] = [
  {
    id: 'developer_agent',
    name: agentMap.developer_agent.name,
    icon: agentMap.developer_agent.icon,
  },
  {
    id: 'browser_agent',
    name: agentMap.browser_agent.name,
    icon: agentMap.browser_agent.icon,
  },
  {
    id: 'document_agent',
    name: agentMap.document_agent.name,
    icon: agentMap.document_agent.icon,
  },
  {
    id: 'multi_modal_agent',
    name: agentMap.multi_modal_agent.name,
    icon: agentMap.multi_modal_agent.icon,
  },
  {
    id: 'social_media_agent',
    name: agentMap.social_media_agent.name,
    icon: agentMap.social_media_agent.icon,
  },
];

/** Get display info (name + icon) by agent name; returns undefined if not a workflow agent. */
export function getWorkflowAgentDisplay(
  agentName: string
): { name: string; icon: ReactNode } | undefined {
  const entry = WORKFLOW_AGENT_LIST.find(
    (a) => a.id.toLowerCase() === agentName.toLowerCase()
  );
  if (!entry) return undefined;
  return { name: entry.name, icon: entry.icon };
}
