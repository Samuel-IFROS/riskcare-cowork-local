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

import { getStoredLanguage, setStoredLanguage } from '@/lib/authStorage';
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

const BRAND_NAME = 'Riskcare cowork';
const BRAND_TOKEN_PATTERN =
  /(^|[^A-Za-z0-9@.:-])(eigent)(?=[^A-Za-z0-9@.:-]|$)/gi;
const AVAILABLE_LANGUAGES = Object.values(LocaleEnum);

const replaceBrandToken = (value: string) =>
  value.replace(BRAND_TOKEN_PATTERN, (_match, prefix: string) => {
    return `${prefix}${BRAND_NAME}`;
  });

const normalizeLanguage = (language: string): string =>
  language.trim().toLowerCase();

const findSupportedLocale = (language: string): LocaleEnum | null => {
  const normalized = normalizeLanguage(language);

  const exactMatch = AVAILABLE_LANGUAGES.find(
    (locale) => normalizeLanguage(locale) === normalized
  );
  if (exactMatch) return exactMatch as LocaleEnum;

  const primaryCode = normalized.split('-')[0];
  const byPrimaryCode = AVAILABLE_LANGUAGES.find(
    (locale) => normalizeLanguage(locale).split('-')[0] === primaryCode
  );
  return (byPrimaryCode as LocaleEnum | undefined) ?? null;
};

const resolveSystemLocale = (): LocaleEnum => {
  if (typeof navigator === 'undefined' || !navigator.language) {
    return LocaleEnum.English;
  }
  return findSupportedLocale(navigator.language) ?? LocaleEnum.English;
};

const resolveLanguage = (language?: string | null): LocaleEnum => {
  if (!language || normalizeLanguage(language) === 'system') {
    return resolveSystemLocale();
  }
  return findSupportedLocale(language) ?? resolveSystemLocale();
};

const initializeI18n = () => {
  const initialLanguage = resolveLanguage(getStoredLanguage());

  try {
    i18n
      .use({
        type: 'postProcessor',
        name: 'brandName',
        process(value: unknown) {
          if (typeof value !== 'string') {
            return value as string;
          }
          return replaceBrandToken(value);
        },
      })
      .use(initReactI18next)
      .init({
        resources,
        fallbackLng: LocaleEnum.English,
        lng: initialLanguage,
        postProcess: ['brandName'],
        interpolation: {
          escapeValue: false,
        },
      });
  } catch (error) {
    console.error('[i18n] Failed to initialize:', error);
  }
};

initializeI18n();

export const switchLanguage = (language: LanguagePreference) => {
  const nextLanguage = resolveLanguage(language);
  void i18n.changeLanguage(nextLanguage);
  setStoredLanguage(language);
};

export default i18n;


