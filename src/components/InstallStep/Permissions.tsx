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

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/authStore';
import { ArrowRight, FileCheck2, ShieldCheck } from 'lucide-react';
import React, { useState } from 'react';
import { Button } from '../ui/button';

export const Permissions: React.FC = () => {
  const { setInitState } = useAuthStore();
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="flex h-full w-full flex-col justify-between gap-lg">
      <div className="flex flex-col gap-md">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-success text-text-success">
          <FileCheck2 className="h-6 w-6" />
        </div>
        <div className="flex flex-col gap-xs">
          <div className="text-heading-sm font-bold text-text-heading">
            Riskcare Cowork terms and conditions
          </div>
          <div className="text-body-md font-medium text-text-body">
            Before opening Riskcare, confirm that you accept the conditions for
            using clinical and operational information inside the app.
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-md">
        <div className="rounded-2xl border border-border-tertiary bg-surface-secondary p-md">
          <div className="mb-3 flex items-center gap-2 text-body-sm font-semibold text-text-heading">
            <ShieldCheck className="h-4 w-4 text-text-success" />
            Conditions of use
          </div>
          <div className="max-h-[290px] space-y-3 overflow-y-auto rounded-xl bg-surface-tertiary p-md text-body-sm text-text-body">
            <p>
              By continuing, you confirm that you are authorized to use Riskcare
              Cowork and access the information managed from this device.
            </p>
            <p>
              Clinical and patient information must only be consulted, uploaded,
              or synchronized when the user has granted permission and you are
              allowed to handle that data.
            </p>
            <p>
              You remain responsible for reviewing important actions, validating
              records, and complying with your privacy, confidentiality, and
              security obligations.
            </p>
            <p>
              Riskcare Cowork may deploy local services and background
              components needed to launch the workspace correctly on this
              computer.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border-tertiary bg-surface-secondary p-md">
          <div className="flex items-start gap-3">
            <Checkbox
              id="accept-riskcare-terms"
              checked={accepted}
              onCheckedChange={(value) => setAccepted(value === true)}
              className="mt-1"
            />
            <Label
              htmlFor="accept-riskcare-terms"
              className="cursor-pointer text-body-sm leading-6 text-text-body"
            >
              I accept the Riskcare Cowork terms and conditions and understand
              that clinical data access must always require user consent inside
              the app.
            </Label>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <Button
          onClick={() => setInitState('carousel')}
          variant="primary"
          size="sm"
          disabled={!accepted}
        >
          <div>Accept and continue</div>
          <ArrowRight size={18} className="text-white-100%" />
        </Button>
      </div>
    </div>
  );
};
