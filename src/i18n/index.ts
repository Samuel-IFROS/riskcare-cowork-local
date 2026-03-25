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

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from './locales';

export enum LocaleEnum {
  SimplifiedChinese = 'zh-Hans',
  TraditionalChinese = 'zh-Hant',
  English = 'en-US',
  German = 'de',
  Korean = 'ko',
  Japanese = 'ja',
  French = 'fr',
  Russian = 'ru',
  Italian = 'it',
  Arabic = 'ar',
  Spanish = 'es',
}

export type LanguagePreference = LocaleEnum | 'system';

const getPersistedLanguage = () => {
  try {
    const raw = localStorage.getItem('auth-storage');
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return parsed?.state?.language?.toLowerCase?.() ?? null;
  } catch (_error) {
    return null;
  }
};

const savedLanguage = getPersistedLanguage();
const systemLanguage = navigator.language.toLowerCase();
const availableLanguages = Object.values(LocaleEnum);

let initialLanguage: string;

if (savedLanguage && availableLanguages.includes(savedLanguage as LocaleEnum)) {
  initialLanguage = savedLanguage;
} else {
  const matched = availableLanguages.find((lang) =>
    systemLanguage.startsWith(lang)
  );
  initialLanguage = matched || LocaleEnum.English;
}

export const resolvePreferredLanguage = (
  language: LanguagePreference
): LocaleEnum => {
  if (language !== 'system') {
    return language;
  }

  const runtimeSystemLanguage = navigator.language.toLowerCase();
  const matched = availableLanguages.find((lang) =>
    runtimeSystemLanguage.startsWith(lang.toLowerCase())
  );

  return matched || LocaleEnum.English;
};

i18n.use(initReactI18next).init({
  resources,
  fallbackLng: LocaleEnum.English,
  lng: initialLanguage,
  interpolation: {
    escapeValue: false,
  },
});

export const switchLanguage = (language: LanguagePreference) => {
  const resolvedLanguage = resolvePreferredLanguage(language);

  console.log('switchLanguage', language, '->', resolvedLanguage);
  i18n.changeLanguage(resolvedLanguage);
  import('@/store/authStore')
    .then(({ getAuthStore }) => {
      getAuthStore().setLanguage(language);
    })
    .catch((error) => {
      console.warn('Failed to persist language change:', error);
    });
};

export default i18n;
