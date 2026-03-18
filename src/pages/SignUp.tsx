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

import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Input } from '@/components/ui/input';

import { proxyFetchPost } from '@/api/http';
import background from '@/assets/background.png';
import eyeOff from '@/assets/eye-off.svg';
import eye from '@/assets/eye.svg';
import google from '@/assets/google.svg';
import eigentLogo from '@/assets/logo/eigent_icon.png';
import eigentLogoWhite from '@/assets/logo/eigent_icon_white.png';
import WindowControls from '@/components/WindowControls';
import {
  SUPABASE_GOOGLE_PKCE_KEY,
  buildGooglePkceChallenge,
  buildGooglePkceVerifier,
  buildSupabaseGoogleAuthorizeUrl,
  hasSupabaseAuthConfig,
} from '@/lib/supabaseAuth';
import { loadCoworkWorkers } from '@/service/coworkWorkers';
import { useTranslation } from 'react-i18next';

const HAS_SUPABASE_AUTH = hasSupabaseAuthConfig();
const extractAuthToken = (data: any): string | null => {
  if (typeof data?.token !== 'string') return null;
  const token = data.token.trim();
  return token.length > 0 ? token : null;
};
let lock = false;
export default function SignUp() {
  const { setAuth, setModelType, setLocalProxyValue, setWorkerList } =
    useAuthStore();
  const appearance = useAuthStore((state) => state.appearance);
  const navigate = useNavigate();
  const location = useLocation();
  const [hidePassword, setHidePassword] = useState(true);
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    invite_code: '',
  });
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    invite_code: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const titlebarRef = useRef<HTMLDivElement | null>(null);
  const [platform, setPlatform] = useState<string>('');
  const logoSrc = appearance === 'dark' ? eigentLogoWhite : eigentLogo;

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const newErrors = {
      email: '',
      password: '',
      invite_code: '',
    };

    if (!formData.email) {
      newErrors.email = t('layout.please-enter-email-address');
    } else if (!validateEmail(formData.email)) {
      newErrors.email = t('layout.please-enter-a-valid-email-address');
    }

    if (!formData.password) {
      newErrors.password = t('layout.please-enter-password');
    } else if (formData.password.length < 8) {
      newErrors.password = t('layout.password-must-be-at-least-8-characters');
    }

    setErrors(newErrors);
    return !newErrors.email && !newErrors.password;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field as keyof typeof errors]) {
      setErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    }

    if (generalError) {
      setGeneralError('');
    }
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setGeneralError('');
    setIsLoading(true);
    try {
      const data = await proxyFetchPost('/api/register', {
        email: formData.email,
        password: formData.password,
        invite_code: formData.invite_code,
      });

      if (data.code === 10 || data.code === 1) {
        setGeneralError(
          data.text || t('layout.sign-up-failed-please-try-again')
        );
        return;
      }
      if (data.code === 100 && data.error) {
        let errors = {
          email: '',
          password: '',
          invite_code: '',
        };
        data.error.map((item: any) => {
          errors[item.loc.at(-1) as keyof typeof errors] = item.msg.replace(
            t('layout.value-error'),
            ''
          );
        });
        setErrors(errors);
        return;
      }

      const authToken = extractAuthToken(data);
      if (!authToken) {
        navigate('/login');
        return;
      }

      const authEmail = data.email || formData.email;
      setAuth({
        token: authToken,
        username: data.username || authEmail,
        email: authEmail,
        user_id: data.user_id || '',
      });
      const workers = Array.isArray(data.workers)
        ? data.workers
        : await loadCoworkWorkers(authToken);
      setWorkerList(workers);
      setModelType('custom');
      const localProxyValue = import.meta.env.VITE_USE_LOCAL_PROXY || null;
      setLocalProxyValue(localProxyValue);
      navigate('/');
    } catch (error: any) {
      console.error('Sign up failed:', error);
      setGeneralError(
        t('layout.sign-up-failed-please-check-your-email-and-password')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginByGoogle = useCallback(
    async (code: string) => {
      try {
        const codeVerifier =
          localStorage.getItem(SUPABASE_GOOGLE_PKCE_KEY) || '';
        if (!codeVerifier) {
          setGeneralError('Google signup session expired. Try again.');
          return;
        }
        localStorage.removeItem(SUPABASE_GOOGLE_PKCE_KEY);

        const data = await proxyFetchPost('/api/login-by_google', {
          code,
          code_verifier: codeVerifier,
          invite_code: formData.invite_code,
        });

        if (data.code === 10) {
          setGeneralError(
            data.text || t('layout.login-failed-please-try-again')
          );
          return;
        }
        console.log('data', data);
        const authEmail = data.email || formData.email;
        const authToken = extractAuthToken(data);
        if (!authToken) {
          setGeneralError(t('layout.login-failed-please-try-again'));
          return;
        }
        setAuth({
          token: authToken,
          username: data.username || authEmail,
          email: authEmail,
          user_id: data.user_id || '',
        });
        if (authToken) {
          const workers = Array.isArray(data.workers)
            ? data.workers
            : await loadCoworkWorkers(authToken);
          setWorkerList(workers);
        }
        setModelType('custom');
        const localProxyValue = import.meta.env.VITE_USE_LOCAL_PROXY || null;
        setLocalProxyValue(localProxyValue);
        navigate('/');
      } catch (error: any) {
        console.error('Login failed:', error);
        setGeneralError(
          t('layout.login-failed-please-check-your-email-and-password')
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      formData.email,
      formData.invite_code,
      navigate,
      setAuth,
      setGeneralError,
      setIsLoading,
      setLocalProxyValue,
      setModelType,
      setWorkerList,
      t,
    ]
  );

  const handleGoogleSignUp = useCallback(async () => {
    if (!HAS_SUPABASE_AUTH) {
      setGeneralError('Supabase OAuth is not configured.');
      return;
    }

    try {
      setGeneralError('');
      const codeVerifier = buildGooglePkceVerifier();
      const codeChallenge = await buildGooglePkceChallenge(codeVerifier);
      const authorizeUrl = await buildSupabaseGoogleAuthorizeUrl(codeChallenge);
      localStorage.setItem(SUPABASE_GOOGLE_PKCE_KEY, codeVerifier);
      window.open(authorizeUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Failed to start Google OAuth:', error);
      setGeneralError(t('layout.sign-up-failed-please-try-again'));
    }
  }, [setGeneralError, t]);

  const handleAuthCode = useCallback(
    async (_event: any, code: string) => {
      if (lock || location.pathname !== '/signup') return;

      lock = true;
      setIsLoading(true);
      await handleLoginByGoogle(code);
      setTimeout(() => {
        lock = false;
      }, 1500);
    },
    [location.pathname, handleLoginByGoogle, setIsLoading]
  );

  useEffect(() => {
    window.ipcRenderer?.on('auth-code-received', handleAuthCode);

    return () => {
      window.ipcRenderer?.off('auth-code-received', handleAuthCode);
    };
  }, [handleAuthCode]);

  useEffect(() => {
    const p = window.electronAPI?.getPlatform?.() || '';
    setPlatform(p);

    if (p === 'darwin') {
      titlebarRef.current?.classList.add('mac');
    }
  }, []);

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      {/* Titlebar with drag region and window controls */}
      <div
        className="absolute left-0 right-0 top-0 z-50 flex !h-9 items-center justify-between py-1 pl-2"
        id="signup-titlebar"
        ref={titlebarRef}
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {/* Center drag region */}
        <div
          className="flex h-full flex-1 items-center"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <div className="h-10 flex-1" />
        </div>

        {/* Right window controls */}
        <div
          style={
            {
              WebkitAppRegion: 'no-drag',
              pointerEvents: 'auto',
            } as React.CSSProperties
          }
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <WindowControls />
        </div>
      </div>

      {/* Main content - image extends to top, form has padding */}
      <div
        className={`flex h-full items-center justify-center gap-2 px-2 pb-2 pt-10`}
      >
        <div
          className="flex h-full min-h-0 w-full flex-col items-center justify-center overflow-hidden rounded-2xl border-solid border-border-tertiary bg-surface-secondary px-2 pb-2"
          style={{
            backgroundImage: `url(${background})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="relative flex w-80 flex-1 flex-col items-center justify-center pt-8">
            <img
              src={logoSrc}
              className="absolute left-1/2 top-10 h-24 w-auto -translate-x-1/2 object-contain"
            />
            <div className="mb-4 flex items-end justify-between self-stretch">
              <div className="text-heading-lg font-bold text-text-heading">
                {t('layout.sign-up')}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/login')}
              >
                {t('layout.login')}
              </Button>
            </div>
            {HAS_SUPABASE_AUTH && (
              <div className="w-full pt-6">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleGoogleSignUp}
                  className="mb-4 w-full justify-center rounded-[24px] text-center font-inter text-[15px] font-bold leading-[22px] text-[#F5F5F5] transition-all duration-300 ease-in-out"
                  disabled={isLoading}
                >
                  <img src={google} className="h-5 w-5" />
                  <span className="ml-2">
                    {t('layout.continue-with-google-sign-up')}
                  </span>
                </Button>
              </div>
            )}
            {HAS_SUPABASE_AUTH && (
              <div className="mb-6 mt-2 w-full text-center font-inter text-[15px] font-medium leading-[22px] text-[#222]">
                {t('layout.or')}
              </div>
            )}
            <div className="flex w-full flex-col gap-4">
              {generalError && (
                <p className="mb-4 mt-1 text-label-md text-text-cuation">
                  {generalError}
                </p>
              )}
              <div className="relative mb-4 flex w-full flex-col gap-4">
                <Input
                  id="email"
                  type="email"
                  size="default"
                  title={t('layout.email')}
                  placeholder={t('layout.enter-your-email')}
                  required
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  state={errors.email ? 'error' : undefined}
                  note={errors.email}
                />

                <Input
                  id="password"
                  title={t('layout.password')}
                  size="default"
                  type={hidePassword ? 'password' : 'text'}
                  required
                  placeholder={t('layout.enter-your-password')}
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange('password', e.target.value)
                  }
                  state={errors.password ? 'error' : undefined}
                  note={errors.password}
                  backIcon={<img src={hidePassword ? eye : eyeOff} />}
                  onBackIconClick={() => setHidePassword(!hidePassword)}
                />

                <Input
                  id="invite_code"
                  title={t('layout.invitation-code-optional')}
                  size="default"
                  type="text"
                  placeholder={t('layout.enter-your-invite-code')}
                  value={formData.invite_code}
                  onChange={(e) =>
                    handleInputChange('invite_code', e.target.value)
                  }
                  state={errors.invite_code ? 'error' : undefined}
                  note={errors.invite_code}
                />
              </div>
            </div>
            <Button
              onClick={handleRegister}
              size="md"
              variant="primary"
              type="submit"
              className="w-full rounded-full"
              disabled={isLoading}
            >
              <span className="flex-1">
                {isLoading ? t('layout.signing-up') : t('layout.sign-up')}
              </span>
            </Button>
          </div>
          <Button
            variant="ghost"
            size="xs"
            onClick={() =>
              window.open(
                'https://www.eigent.ai/privacy-policy',
                '_blank',
                'noopener,noreferrer'
              )
            }
          >
            {t('layout.privacy-policy')}
          </Button>
        </div>
      </div>
    </div>
  );
}
