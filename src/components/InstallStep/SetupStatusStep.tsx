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

import { useInstallationUI } from '@/store/installationStore';
import { CheckCircle2, LoaderCircle, Rocket } from 'lucide-react';

const getStatusText = (
  isInstalling: boolean,
  installationState: string,
  latestLog?: string
) => {
  if (latestLog) {
    return latestLog;
  }

  if (isInstalling) {
    return 'Riskcare is deploying the local services and app resources needed for first launch.';
  }

  if (installationState === 'waiting-backend') {
    return 'The app is starting local services and will open the workspace as soon as everything responds correctly.';
  }

  return 'Your workspace is almost ready. Riskcare will open automatically as soon as startup checks finish.';
};

export const SetupStatusStep = () => {
  const { isInstalling, installationState, latestLog } = useInstallationUI();

  return (
    <div className="flex h-full w-full flex-col justify-between gap-lg">
      <div className="flex flex-col gap-md">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-success text-text-success">
          {isInstalling || installationState === 'waiting-backend' ? (
            <LoaderCircle className="h-6 w-6 animate-spin" />
          ) : (
            <Rocket className="h-6 w-6" />
          )}
        </div>
        <div className="flex flex-col gap-xs">
          <div className="text-heading-sm font-bold text-text-heading">
            Preparing Riskcare Cowork
          </div>
          <div className="text-body-md font-medium text-text-body">
            The installer is finishing the local setup so the workspace can open
            without any extra files or manual steps.
          </div>
        </div>
      </div>

      <div className="grid gap-md">
        <div className="rounded-2xl border border-border-tertiary bg-surface-secondary p-md">
          <div className="mb-2 text-body-sm font-semibold text-text-heading">
            Current status
          </div>
          <div className="text-body-sm leading-6 text-text-body">
            {getStatusText(
              isInstalling,
              installationState,
              latestLog?.data?.trim()
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border-tertiary bg-surface-secondary p-md">
          <div className="mb-3 text-body-sm font-semibold text-text-heading">
            What happens next
          </div>
          <div className="space-y-3 text-body-sm text-text-body">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-text-success" />
              <span>
                The app keeps deploying bundled services and resources.
              </span>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-text-success" />
              <span>
                Riskcare verifies that the local backend is responding.
              </span>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-text-success" />
              <span>
                When everything is ready, the workspace opens automatically.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
