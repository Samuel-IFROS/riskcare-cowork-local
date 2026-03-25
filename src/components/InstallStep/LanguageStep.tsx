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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  type LanguagePreference,
  LocaleEnum,
  resolvePreferredLanguage,
  switchLanguage,
} from '@/i18n';
import { useAuthStore } from '@/store/authStore';
import { ArrowRight, Languages } from 'lucide-react';
import { useMemo, useState } from 'react';

const LANGUAGE_OPTIONS: { value: LanguagePreference; label: string }[] = [
  { value: 'system', label: 'System default' },
  { value: LocaleEnum.Spanish, label: 'Espanol' },
  { value: LocaleEnum.English, label: 'English' },
  { value: LocaleEnum.French, label: 'Francais' },
  { value: LocaleEnum.German, label: 'Deutsch' },
  { value: LocaleEnum.Italian, label: 'Italiano' },
  { value: LocaleEnum.Japanese, label: 'Japanese' },
  { value: LocaleEnum.Korean, label: 'Korean' },
  { value: LocaleEnum.Arabic, label: 'Arabic' },
  { value: LocaleEnum.Russian, label: 'Russian' },
  { value: LocaleEnum.SimplifiedChinese, label: 'Chinese (Simplified)' },
  { value: LocaleEnum.TraditionalChinese, label: 'Chinese (Traditional)' },
];

export const LanguageStep = () => {
  const { language, setInitState } = useAuthStore();
  const [selectedLanguage, setSelectedLanguage] = useState<LanguagePreference>(
    language === 'system' ? 'system' : (language as LocaleEnum)
  );

  const resolvedLanguage = useMemo(
    () => resolvePreferredLanguage(selectedLanguage),
    [selectedLanguage]
  );

  const selectedLabel =
    LANGUAGE_OPTIONS.find((option) => option.value === selectedLanguage)
      ?.label ?? 'English';

  const handleContinue = () => {
    switchLanguage(selectedLanguage);
    setInitState('carousel');
  };

  return (
    <div className="flex h-full w-full flex-col justify-between gap-lg">
      <div className="flex flex-col gap-md">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-success text-text-success">
          <Languages className="h-6 w-6" />
        </div>
        <div className="flex flex-col gap-xs">
          <div className="text-heading-sm font-bold text-text-heading">
            Choose your language
          </div>
          <div className="text-body-md font-medium text-text-body">
            Elige el idioma antes de abrir Riskcare. Podras cambiarlo despues en
            Ajustes.
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-md">
        <div className="rounded-2xl border border-border-tertiary bg-surface-secondary p-md">
          <div className="mb-2 text-body-sm font-semibold text-text-heading">
            Language / Idioma
          </div>
          <Select
            value={selectedLanguage}
            onValueChange={(value) =>
              setSelectedLanguage(value as LanguagePreference)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-2xl bg-surface-tertiary p-md text-body-sm text-text-label">
          Selected:{' '}
          <span className="font-semibold text-text-heading">
            {selectedLabel}
          </span>
          <br />
          Riskcare will start using:{' '}
          <span className="font-semibold text-text-heading">
            {resolvedLanguage}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <Button onClick={handleContinue} variant="primary" size="sm">
          <div>Continue</div>
          <ArrowRight size={18} className="text-white-100%" />
        </Button>
      </div>
    </div>
  );
};
