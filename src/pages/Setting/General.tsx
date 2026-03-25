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

import dark from '@/assets/dark.png';
import light from '@/assets/light.png';
import transparent from '@/assets/transparent.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type LanguagePreference, LocaleEnum, switchLanguage } from '@/i18n';
import { getProfileManagementUrl } from '@/lib/supabaseAuth';
import { useAuthStore } from '@/store/authStore';
import { useInstallationStore } from '@/store/installationStore';
import { LogOut, Settings } from 'lucide-react';
import { createRef, RefObject, useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import useChatStoreAdapter from '@/hooks/useChatStoreAdapter';

export default function SettingGeneral() {
  const { t } = useTranslation();
  const authStore = useAuthStore();

  const resetInstallation = useInstallationStore((state) => state.reset);
  const setNeedsBackendRestart = useInstallationStore(
    (state) => state.setNeedsBackendRestart
  );

  const navigate = useNavigate();
  const [_isLoading, _setIsLoading] = useState(false);
  const setAppearance = authStore.setAppearance;
  const language = authStore.language;
  const setLanguage = authStore.setLanguage;
  const appearance = authStore.appearance;
  const _fullNameRef: RefObject<HTMLInputElement> = createRef();
  const _nickNameRef: RefObject<HTMLInputElement> = createRef();
  const _workDescRef: RefObject<HTMLInputElement> = createRef();
  //Get Chatstore for the active project's task
  const { chatStore } = useChatStoreAdapter();

  const [themeList, setThemeList] = useState<any>([
    {
      img: dark,
      label: 'setting.dark',
      value: 'dark',
    },
    {
      img: light,
      label: 'setting.light',
      value: 'light',
    },
    {
      img: transparent,
      label: 'setting.transparent',
      value: 'transparent',
    },
  ]);

  // Proxy configuration state
  const [proxyUrl, setProxyUrl] = useState('');
  const [isProxySaving, setIsProxySaving] = useState(false);
  const [proxyNeedsRestart, setProxyNeedsRestart] = useState(false);
  const [showLocalProfilePanel, setShowLocalProfilePanel] = useState(false);

  useEffect(() => {
    const platform = window.electronAPI.getPlatform();
    console.log(platform);
    const baseThemes = [
      {
        img: dark,
        label: 'setting.dark',
        value: 'dark',
      },
      {
        img: light,
        label: 'setting.light',
        value: 'light',
      },
    ];

    if (platform === 'darwin') {
      setThemeList([
        ...baseThemes,
        {
          img: transparent,
          label: 'setting.transparent',
          value: 'transparent',
        },
      ]);
    } else {
      setThemeList(baseThemes);
    }
  }, []);

  const languageList = [
    {
      key: LocaleEnum.English,
      label: 'English',
    },
    {
      key: LocaleEnum.SimplifiedChinese,
      label: '简体中文',
    },
    {
      key: LocaleEnum.TraditionalChinese,
      label: '繁體中文',
    },
    {
      key: LocaleEnum.Japanese,
      label: '日本語',
    },
    {
      key: LocaleEnum.Arabic,
      label: 'العربية',
    },
    {
      key: LocaleEnum.French,
      label: 'Français',
    },
    {
      key: LocaleEnum.German,
      label: 'Deutsch',
    },
    {
      key: LocaleEnum.Russian,
      label: 'Русский',
    },
    {
      key: LocaleEnum.Spanish,
      label: 'Español',
    },
    {
      key: LocaleEnum.Korean,
      label: '한국어',
    },
    {
      key: LocaleEnum.Italian,
      label: 'Italiano',
    },
  ];

  const handleLanguageChange = (value: string) => {
    const nextLanguage: LanguagePreference =
      value === 'system'
        ? 'system'
        : ((languageList.find((item) => item.key === value)?.key ??
            LocaleEnum.English) as LocaleEnum);

    setLanguage(nextLanguage);
    switchLanguage(nextLanguage);
  };

  useEffect(() => {
    // Load proxy configuration from global env
    const loadProxyConfig = async () => {
      if (window.electronAPI?.readGlobalEnv) {
        try {
          const result = await window.electronAPI.readGlobalEnv('HTTP_PROXY');
          if (result?.value) {
            setProxyUrl(result.value);
          }
        } catch (_error) {
          console.log('No proxy configured');
        }
      }
    };
    loadProxyConfig();
  }, []);

  // Save proxy configuration
  const handleSaveProxy = async () => {
    if (!authStore.email) {
      toast.error(t('setting.proxy-save-failed'));
      return;
    }

    const trimmed = proxyUrl.trim();

    // Validate proxy URL format when non-empty
    if (trimmed) {
      try {
        const parsed = new URL(trimmed);
        if (
          !['http:', 'https:', 'socks5:', 'socks4:'].includes(parsed.protocol)
        ) {
          toast.error(t('setting.proxy-invalid-url'));
          return;
        }
      } catch {
        toast.error(t('setting.proxy-invalid-url'));
        return;
      }
    }

    if (!window.electronAPI?.envWrite || !window.electronAPI?.envRemove) {
      toast.error(t('setting.proxy-save-failed'));
      return;
    }

    setIsProxySaving(true);
    try {
      if (trimmed) {
        const result = await window.electronAPI.envWrite(authStore.email, {
          key: 'HTTP_PROXY',
          value: trimmed,
        });
        if (!result?.success) throw new Error('envWrite returned no success');
      } else {
        const result = await window.electronAPI.envRemove(
          authStore.email,
          'HTTP_PROXY'
        );
        if (!result?.success) throw new Error('envRemove returned no success');
      }
      setProxyNeedsRestart(true);
      toast.success(t('setting.proxy-saved-restart-required'));
    } catch (error) {
      console.error('Failed to save proxy:', error);
      toast.error(t('setting.proxy-save-failed'));
    } finally {
      setIsProxySaving(false);
    }
  };

  const handleCopyEmail = async () => {
    if (!authStore.email) return;

    try {
      await navigator.clipboard.writeText(authStore.email);
      toast.success('Correo copiado');
    } catch (error) {
      console.error('Failed to copy email:', error);
      toast.error('No se pudo copiar el correo');
    }
  };

  const handleManageProfile = () => {
    const profileManagementUrl = getProfileManagementUrl(authStore.email);

    if (!profileManagementUrl) {
      setShowLocalProfilePanel((previous) => !previous);
      return;
    }

    setShowLocalProfilePanel(false);

    if (/^https?:\/\//i.test(profileManagementUrl)) {
      window.open(profileManagementUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (profileManagementUrl.startsWith('#')) {
      navigate(profileManagementUrl.replace(/^#/, '') || '/');
      return;
    }

    navigate(profileManagementUrl);
  };

  if (!chatStore) {
    return <div>Loading...</div>;
  }

  return (
    <div className="m-auto h-auto w-full flex-1">
      {/* Header Section */}
      <div className="mx-auto flex w-full max-w-[900px] items-center justify-between px-6 pb-6 pt-8">
        <div className="flex w-full flex-row items-center justify-between gap-4">
          <div className="flex flex-col">
            <div className="text-heading-sm font-bold text-text-heading">
              {t('setting.general')}
            </div>
          </div>
        </div>
      </div>
      {/* Content Section */}
      <div className="mb-8 flex flex-col gap-6">
        {/* Profile Section */}
        <div className="rounded-2xl bg-surface-secondary px-6 py-4">
          <div className="item-center flex flex-row justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="text-body-base font-bold text-text-heading">
                {t('setting.profile')}
              </div>
              <div className="text-body-sm">
                <Trans
                  i18nKey="setting.you-are-currently-signed-in-with"
                  values={{ email: authStore.email }}
                  components={{
                    email: <span className="text-text-information underline" />,
                  }}
                />
              </div>
            </div>
            <div className="flex items-center gap-sm">
              <Button onClick={handleManageProfile} variant="primary" size="sm">
                <Settings className="h-4 w-4 text-button-primary-icon-default" />
                {t('setting.manage')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  chatStore.clearTasks();

                  resetInstallation(); // Reset installation state for new account
                  setNeedsBackendRestart(true); // Mark that backend is restarting

                  authStore.logout();
                  navigate('/login');
                }}
              >
                <LogOut className="h-4 w-4 text-button-tertiery-text-default" />
                {t('setting.log-out')}
              </Button>
            </div>
          </div>
          {showLocalProfilePanel && (
            <div className="mt-4 rounded-xl border border-border-secondary bg-surface-tertiary px-4 py-3">
              <div className="text-body-sm font-medium text-text-heading">
                Esta cuenta se gestiona localmente en RISKCARE.
              </div>
              <div className="mt-1 text-sm text-text-secondary">
                Ya no te redirige a Eigent. Cuando definas una URL de perfil de
                RISKCARE, este boton tambien podra abrir esa pagina sin tocar el
                resto de la app.
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyEmail}
                  disabled={!authStore.email}
                >
                  Copiar correo
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Language Section */}
        <div className="item-center flex flex-row justify-between rounded-2xl bg-surface-secondary px-6 py-4">
          <div className="flex flex-1 items-center">
            <div className="text-body-base font-bold text-text-heading">
              {t('setting.language')}
            </div>
          </div>
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t('setting.select-language')} />
            </SelectTrigger>
            <SelectContent className="border bg-input-bg-default">
              <SelectGroup>
                <SelectItem value="system">
                  {t('setting.system-default')}
                </SelectItem>
                {languageList.map((item) => (
                  <SelectItem key={item.key} value={item.key}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Appearance Section */}
        <div className="item-center flex flex-col justify-between gap-4 rounded-2xl bg-surface-secondary px-6 py-4">
          <div className="text-body-base font-bold text-text-heading">
            {t('setting.appearance')}
          </div>
          <div className="flex w-full flex-row items-center gap-md">
            {themeList.map((item: any) => (
              <div
                key={item.label}
                className="group flex w-full flex-col items-center gap-sm hover:cursor-pointer"
                onClick={() => setAppearance(item.value)}
              >
                <img
                  src={item.img}
                  className={`group-hover:border-bg-fill-info-primary aspect-[183/91.67] w-full rounded-lg border border-solid border-transparent transition-all ${
                    item.value == appearance
                      ? 'border-bg-fill-info-primary'
                      : ''
                  }`}
                  alt=""
                />
                <div
                  className={`text-sm text-text-primary group-hover:underline ${
                    item.value == appearance ? 'underline' : ''
                  }`}
                >
                  {t(item.label)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-4 rounded-2xl bg-surface-secondary px-6 py-4">
        <div className="flex flex-col gap-1">
          <div className="text-body-base font-bold text-text-heading">
            {t('setting.network-proxy')}
          </div>
          <div className="mb-4 text-sm leading-13 text-text-secondary">
            {t('setting.network-proxy-description')}
          </div>
        </div>
        <Input
          placeholder={t('setting.proxy-placeholder')}
          value={proxyUrl}
          onChange={(e) => {
            setProxyUrl(e.target.value);
            setProxyNeedsRestart(false);
          }}
          className="flex-1"
          size="default"
          note={proxyNeedsRestart ? t('setting.proxy-restart-hint') : undefined}
          trailingButton={
            <Button
              variant={proxyNeedsRestart ? 'outline' : 'primary'}
              size="sm"
              onClick={
                proxyNeedsRestart
                  ? () => window.electronAPI?.restartApp()
                  : handleSaveProxy
              }
              disabled={!proxyNeedsRestart && isProxySaving}
            >
              {proxyNeedsRestart
                ? t('setting.restart-to-apply')
                : isProxySaving
                  ? t('setting.saving')
                  : t('setting.save')}
            </Button>
          }
        />
      </div>
      {/* Preferred IDE Section */}
      <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-surface-secondary px-6 py-4">
        <div className="flex flex-col gap-1">
          <div className="text-body-base font-bold text-text-heading">
            {t('setting.preferred-ide')}
          </div>
          <div className="text-sm leading-13 text-text-secondary">
            {t('setting.preferred-ide-description')}
          </div>
        </div>
        <Select
          value={authStore.preferredIDE}
          onValueChange={(value) =>
            authStore.setPreferredIDE(value as 'vscode' | 'cursor' | 'system')
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border bg-input-bg-default">
            <SelectGroup>
              <SelectItem value="system">
                {t('setting.system-file-manager')}
              </SelectItem>
              <SelectItem value="vscode">VS Code</SelectItem>
              <SelectItem value="cursor">Cursor</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
