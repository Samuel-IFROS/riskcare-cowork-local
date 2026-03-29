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

type ClinicalConsentAction = 'load' | 'save';

interface ClinicalConsentDialogProps {
  action: ClinicalConsentAction;
  open: boolean;
  isLoading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const CONSENT_COPY: Record<
  ClinicalConsentAction,
  {
    title: string;
    description: string;
    details: string[];
    confirmLabel: string;
  }
> = {
  load: {
    title: 'Permiso para consultar datos clínicos',
    description:
      'Antes de abrir información desde Supabase, confirma que deseas consultar datos clínicos y de archivos asociados a tu sesión.',
    details: [
      'Se leerán pacientes, especialistas, expedientes, citas y adjuntos asociados a tu cuenta.',
      'No se modificará ninguna fila durante esta consulta.',
      'La app solo hará la consulta después de tu aprobación explícita.',
    ],
    confirmLabel: 'Autorizar consulta',
  },
  save: {
    title: 'Permiso para subir datos clínicos',
    description:
      'Antes de sincronizar con Supabase, confirma que deseas guardar los cambios clínicos locales y los metadatos de archivos relacionados.',
    details: [
      'Se subirán pacientes, especialistas, expedientes, citas y adjuntos del módulo clínico.',
      'La sincronización reemplazará en Supabase las filas de tu usuario por el estado actual del módulo.',
      'La app no enviará datos clínicos mientras no autorices esta acción.',
    ],
    confirmLabel: 'Autorizar subida',
  },
};

export function ClinicalConsentDialog({
  action,
  open,
  isLoading = false,
  onCancel,
  onConfirm,
}: ClinicalConsentDialogProps): JSX.Element | null {
  if (!open) {
    return null;
  }

  const copy = CONSENT_COPY[action];

  return (
    <div className="bg-black/50 fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-background w-full max-w-xl rounded-2xl border p-6 shadow-2xl">
        <h2 className="text-foreground text-2xl font-bold">{copy.title}</h2>
        <p className="text-muted-foreground mt-3 text-sm leading-6">
          {copy.description}
        </p>

        <div className="bg-muted/40 mt-5 rounded-xl border p-4">
          <div className="space-y-2 text-sm">
            {copy.details.map((detail) => (
              <p key={detail} className="text-foreground/90">
                - {detail}
              </p>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Procesando...' : copy.confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
