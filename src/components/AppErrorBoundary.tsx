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

import React from 'react';

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[AppErrorBoundary] Unhandled render error:', error);
    console.error('[AppErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="flex h-full w-full items-center justify-center px-6">
        <div className="max-w-[760px] rounded-xl border border-border-secondary bg-surface-secondary p-6">
          <h2 className="mb-3 text-heading-lg font-bold text-text-heading">
            Riskcare no pudo iniciar correctamente
          </h2>
          <p className="mb-4 text-body-sm text-text-label">
            Se detectó un error en el frontend. Puedes recargar para reintentar.
          </p>
          <pre className="scrollbar mb-5 max-h-[220px] overflow-auto rounded-md bg-surface-tertiary p-3 text-xs text-text-primary">
            {this.state.error.message}
            {this.state.error.stack ? `\n\n${this.state.error.stack}` : ''}
          </pre>
          <button
            className="rounded-md bg-fill-default px-4 py-2 text-body-sm text-text-primary"
            onClick={() => window.location.reload()}
            type="button"
          >
            Recargar
          </button>
        </div>
      </div>
    );
  }
}

