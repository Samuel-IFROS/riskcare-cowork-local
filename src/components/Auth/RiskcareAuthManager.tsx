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

import { proxyFetchPost } from '@/api/http';
import background from '@/assets/background.png';
import google from '@/assets/google.svg';
import riskcareLogo from '@/assets/logo/logo_black.png';
import riskcareLogoWhite from '@/assets/logo/logo_white.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import WindowControls from '@/components/WindowControls';
import {
  buildOauthPkceChallenge,
  buildOauthPkceVerifier,
  buildSupabaseOAuthAuthorizeUrl,
  clearPendingSupabaseOAuth,
  getPendingSupabaseOAuth,
  hasSupabaseAuthConfig,
  LOCAL_SUPABASE_AUTH_CALLBACK,
  setPendingSupabaseOAuth,
  subscribeRiskcareRuntimeConfig,
  type SupabaseOAuthProvider,
} from '@/lib/supabaseAuth';
import { loadCoworkWorkers } from '@/service/coworkWorkers';
import { useAuthStore } from '@/store/authStore';
import { Mail } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type PasswordAction = 'login' | 'register';

type AuthSessionPayload = {
  accessToken?: string;
  refreshToken?: string;
  error?: string;
  errorDescription?: string;
};

const extractAuthToken = (data: any): string | null => {
  if (typeof data?.token !== 'string') return null;
  const token = data.token.trim();
  return token.length > 0 ? token : null;
};

function MicrosoftIcon(): JSX.Element {
  return (
    <div className="grid h-5 w-5 grid-cols-2 gap-[2px]">
      <span className="rounded-[2px] bg-[#f25022]" />
      <span className="rounded-[2px] bg-[#7fba00]" />
      <span className="rounded-[2px] bg-[#00a4ef]" />
      <span className="rounded-[2px] bg-[#ffb900]" />
    </div>
  );
}

export function RiskcareAuthManager(): JSX.Element {
  const {
    setAuth,
    setModelType,
    setCloudModelType,
    setLocalProxyValue,
    setWorkerList,
  } = useAuthStore();
  const appearance = useAuthStore((state) => state.appearance);
  const navigate = useNavigate();
  const titlebarRef = useRef<HTMLDivElement>(null);
  const isProcessingCallbackRef = useRef(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [hasSupabaseAuth, setHasSupabaseAuth] = useState(() =>
    hasSupabaseAuthConfig()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordAuth, setShowPasswordAuth] = useState(false);
  const [passwordAction, setPasswordAction] = useState<PasswordAction>('login');
  const logoSrc = appearance === 'dark' ? riskcareLogoWhite : riskcareLogo;

  const clearMessages = useCallback(() => {
    if (statusMessage) {
      setStatusMessage('');
    }
    if (generalError) {
      setGeneralError('');
    }
  }, [generalError, statusMessage]);

  const validateEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const completeAuth = useCallback(
    async (data: any, fallbackEmail?: string) => {
      const authToken = extractAuthToken(data);
      if (!authToken) {
        throw new Error('No se recibió un token válido desde el servidor.');
      }

      const authEmail = data.email || fallbackEmail || '';
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
      setModelType('cloud');
      setCloudModelType('gemini-3-pro-preview');
      setLocalProxyValue(import.meta.env.VITE_USE_LOCAL_PROXY || null);
      navigate('/');
    },
    [
      navigate,
      setAuth,
      setCloudModelType,
      setLocalProxyValue,
      setModelType,
      setWorkerList,
    ]
  );

  const handlePasswordAuth = useCallback(async () => {
    clearMessages();
    if (!validateEmail(email)) {
      setGeneralError('Ingresa un correo válido.');
      return;
    }
    if (!password || password.length < 8) {
      setGeneralError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setIsLoading(true);
    try {
      const endpoint =
        passwordAction === 'register' ? '/api/register' : '/api/login';
      const data = await proxyFetchPost(endpoint, { email, password });
      if (data?.code !== 0) {
        setGeneralError(
          data?.text ||
            (passwordAction === 'register'
              ? 'No se pudo crear la cuenta.'
              : 'No se pudo iniciar sesión.')
        );
        return;
      }

      if (!extractAuthToken(data)) {
        setStatusMessage(
          data?.message ||
            'Cuenta creada. Revisa tu correo para verificarla antes de entrar.'
        );
        setPasswordAction('login');
        return;
      }

      await completeAuth(data, email);
    } catch (error) {
      setGeneralError(
        error instanceof Error
          ? error.message
          : 'No se pudo completar la autenticación local.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [clearMessages, completeAuth, email, password, passwordAction]);

  const startOAuthFlow = useCallback(
    async (provider: SupabaseOAuthProvider) => {
      if (!hasSupabaseAuth) {
        setGeneralError('Supabase no está configurado en esta instalación.');
        return;
      }

      clearMessages();
      setIsLoading(true);
      try {
        const codeVerifier = buildOauthPkceVerifier();
        const codeChallenge = await buildOauthPkceChallenge(codeVerifier);
        const redirectUri = LOCAL_SUPABASE_AUTH_CALLBACK;
        const authorizeUrl = await buildSupabaseOAuthAuthorizeUrl(
          provider,
          codeChallenge,
          redirectUri
        );

        setPendingSupabaseOAuth({
          provider,
          codeVerifier,
          redirectUri,
          createdAt: Date.now(),
        });
        window.open(authorizeUrl, '_blank', 'noopener,noreferrer');
      } catch (error) {
        clearPendingSupabaseOAuth();
        setGeneralError(
          error instanceof Error
            ? error.message
            : 'No fue posible iniciar el flujo OAuth.'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [clearMessages, hasSupabaseAuth]
  );

  const handleMagicLink = useCallback(async () => {
    clearMessages();
    if (!hasSupabaseAuth) {
      setGeneralError(
        'Supabase no está configurado. Usa la cuenta local con contraseña.'
      );
      setShowPasswordAuth(true);
      return;
    }
    if (!validateEmail(email)) {
      setGeneralError('Ingresa un correo válido para enviar el enlace.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await proxyFetchPost('/api/auth/magic-link', {
        email,
        redirect_to: LOCAL_SUPABASE_AUTH_CALLBACK,
        create_user: true,
      });

      if (data?.code !== 0) {
        setGeneralError(
          data?.text || 'No se pudo enviar el enlace seguro a tu correo.'
        );
        return;
      }

      setStatusMessage(
        'Te enviamos un enlace seguro. Revisa tu correo para continuar.'
      );
    } catch (error) {
      setGeneralError(
        error instanceof Error
          ? error.message
          : 'No se pudo enviar el magic link.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [clearMessages, email, hasSupabaseAuth]);

  const handleOAuthCode = useCallback(
    async (_event: any, code: string) => {
      if (isProcessingCallbackRef.current || !code) {
        return;
      }

      const pendingFlow = getPendingSupabaseOAuth();
      if (!pendingFlow) {
        return;
      }

      isProcessingCallbackRef.current = true;
      setIsLoading(true);
      clearMessages();

      try {
        const data = await proxyFetchPost('/api/login-by_oauth', {
          provider: pendingFlow.provider,
          code,
          code_verifier: pendingFlow.codeVerifier,
          redirect_uri: pendingFlow.redirectUri,
        });

        clearPendingSupabaseOAuth();

        if (data?.code !== 0) {
          setGeneralError(
            data?.text || 'No se pudo completar el acceso OAuth.'
          );
          return;
        }

        await completeAuth(data, email);
      } catch (error) {
        clearPendingSupabaseOAuth();
        setGeneralError(
          error instanceof Error
            ? error.message
            : 'Falló la autenticación con el proveedor.'
        );
      } finally {
        setIsLoading(false);
        window.setTimeout(() => {
          isProcessingCallbackRef.current = false;
        }, 500);
      }
    },
    [clearMessages, completeAuth, email]
  );

  const handleSessionPayload = useCallback(
    async (_event: any, payload: AuthSessionPayload) => {
      if (isProcessingCallbackRef.current) {
        return;
      }

      if (payload?.error) {
        setGeneralError(
          payload.errorDescription || payload.error || 'La autenticación falló.'
        );
        return;
      }

      if (!payload?.accessToken) {
        return;
      }

      isProcessingCallbackRef.current = true;
      setIsLoading(true);
      clearMessages();

      try {
        const data = await proxyFetchPost('/api/login-by_stack', {
          token: payload.accessToken,
        });
        if (data?.code !== 0) {
          setGeneralError(
            data?.text || 'No se pudo validar la sesión recibida por correo.'
          );
          return;
        }

        await completeAuth(data, email);
      } catch (error) {
        setGeneralError(
          error instanceof Error
            ? error.message
            : 'No se pudo abrir la sesión desde el magic link.'
        );
      } finally {
        setIsLoading(false);
        window.setTimeout(() => {
          isProcessingCallbackRef.current = false;
        }, 500);
      }
    },
    [clearMessages, completeAuth, email]
  );

  useEffect(() => {
    const platform = window.electronAPI?.getPlatform?.() || '';
    if (platform === 'darwin') {
      titlebarRef.current?.classList.add('mac');
    }
  }, []);

  useEffect(() => {
    setHasSupabaseAuth(hasSupabaseAuthConfig());
    return subscribeRiskcareRuntimeConfig(() => {
      setHasSupabaseAuth(hasSupabaseAuthConfig());
    });
  }, []);

  useEffect(() => {
    window.ipcRenderer?.on('auth-code-received', handleOAuthCode);
    window.ipcRenderer?.on('auth-session-received', handleSessionPayload);

    return () => {
      window.ipcRenderer?.off('auth-code-received', handleOAuthCode);
      window.ipcRenderer?.off('auth-session-received', handleSessionPayload);
    };
  }, [handleOAuthCode, handleSessionPayload]);

  useEffect(() => {
    const handleBeforeClose = () => {
      window.electronAPI?.closeWindow?.(true);
    };

    window.ipcRenderer?.on('before-close', handleBeforeClose);
    return () => {
      window.ipcRenderer?.off('before-close', handleBeforeClose);
    };
  }, []);

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <div
        className="absolute left-0 right-0 top-0 z-50 flex !h-9 items-center justify-between py-1 pl-2"
        ref={titlebarRef}
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div
          className="flex h-full flex-1 items-center"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <div className="h-10 flex-1" />
        </div>
        <div
          style={
            {
              WebkitAppRegion: 'no-drag',
              pointerEvents: 'auto',
            } as React.CSSProperties
          }
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <WindowControls />
        </div>
      </div>

      <div className="flex h-full items-center justify-center px-4 pb-6 pt-12">
        <div
          className="border-white/20 flex h-full min-h-0 w-full items-center justify-center rounded-3xl border px-4 py-8"
          style={{
            backgroundImage: `linear-gradient(135deg, rgba(9, 25, 79, 0.12), rgba(125, 123, 201, 0.08)), url(${background})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="bg-white/95 dark:border-white/10 w-full max-w-[560px] rounded-[28px] border p-8 shadow-2xl backdrop-blur dark:bg-[#0c1530]/95">
            <div className="mb-8 flex flex-col items-center text-center">
              <img src={logoSrc} alt="RiskCare" className="mb-6 h-20 w-auto" />
              <h1 className="text-foreground text-4xl font-bold tracking-tight">
                Iniciar sesión o registrarse
              </h1>
              <p className="text-muted-foreground mt-3 text-lg">
                Accede a RiskCare de forma segura en segundos.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="h-14 w-full justify-center gap-3 rounded-2xl text-base font-semibold"
                onClick={() => void startOAuthFlow('google')}
                disabled={isLoading || !hasSupabaseAuth}
              >
                <img src={google} className="h-5 w-5" />
                Continuar con Google
              </Button>

              <Button
                variant="outline"
                className="h-14 w-full justify-center gap-3 rounded-2xl text-base font-semibold"
                onClick={() => void startOAuthFlow('azure')}
                disabled={isLoading || !hasSupabaseAuth}
              >
                <MicrosoftIcon />
                Continuar con Microsoft
              </Button>
            </div>

            <div className="my-6 flex items-center gap-4">
              <div className="bg-border h-px flex-1" />
              <span className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.3em]">
                O con correo
              </span>
              <div className="bg-border h-px flex-1" />
            </div>

            {statusMessage && (
              <div className="dark:bg-emerald-950/40 mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:text-emerald-300">
                {statusMessage}
              </div>
            )}

            {generalError && (
              <div className="dark:bg-red-950/40 mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:text-red-300">
                {generalError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-foreground mb-2 block text-sm font-semibold">
                  Ingresa con tu correo
                </label>
                <Input
                  id="auth-email"
                  type="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(event) => {
                    clearMessages();
                    setEmail(event.target.value);
                  }}
                  onEnter={handleMagicLink}
                />
              </div>

              <Button
                className="h-14 w-full justify-center gap-3 rounded-2xl text-base font-semibold"
                onClick={() => void handleMagicLink()}
                disabled={isLoading}
              >
                <Mail size={18} />
                Continuar con correo
              </Button>
            </div>

            <p className="text-muted-foreground mt-4 text-center text-sm">
              Te enviaremos un enlace seguro para entrar sin contraseña.
            </p>

            <div className="mt-6 rounded-2xl border border-dashed p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">Acceso alternativo</p>
                  <p className="text-muted-foreground text-sm">
                    Usa contraseña si necesitas compatibilidad local o si
                    Supabase no está disponible.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => {
                    clearMessages();
                    setShowPasswordAuth((current) => !current);
                  }}
                >
                  {showPasswordAuth ? 'Ocultar' : 'Usar contraseña'}
                </Button>
              </div>

              {(showPasswordAuth || !hasSupabaseAuth) && (
                <div className="mt-4 space-y-4">
                  <div className="flex gap-2">
                    <Button
                      variant={
                        passwordAction === 'login' ? 'default' : 'outline'
                      }
                      size="sm"
                      onClick={() => setPasswordAction('login')}
                    >
                      Entrar
                    </Button>
                    <Button
                      variant={
                        passwordAction === 'register' ? 'default' : 'outline'
                      }
                      size="sm"
                      onClick={() => setPasswordAction('register')}
                    >
                      Crear cuenta
                    </Button>
                  </div>

                  <Input
                    id="auth-password"
                    type="password"
                    placeholder="Contraseña"
                    value={password}
                    onChange={(event) => {
                      clearMessages();
                      setPassword(event.target.value);
                    }}
                    onEnter={handlePasswordAuth}
                  />

                  <Button
                    variant="outline"
                    className="w-full rounded-2xl"
                    onClick={() => void handlePasswordAuth()}
                    disabled={isLoading}
                  >
                    {passwordAction === 'register'
                      ? 'Crear cuenta con contraseña'
                      : 'Entrar con contraseña'}
                  </Button>
                </div>
              )}
            </div>

            <p className="text-muted-foreground mt-6 text-center text-xs leading-6">
              Al continuar aceptas los términos de uso y la política de
              privacidad de RiskCare.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
