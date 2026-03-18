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

import { app, ipcMain } from 'electron';
import type {
  ProgressInfo,
  UpdateDownloadedEvent,
  UpdateInfo,
} from 'electron-updater';
import { createRequire } from 'node:module';

const { autoUpdater } = createRequire(import.meta.url)('electron-updater');

const isDevUpdaterEnabled = () =>
  !app.isPackaged && process.env.EIGENT_ENABLE_DEV_UPDATER === '1';

const isUpdaterEnabled = () => app.isPackaged || isDevUpdaterEnabled();

export function update(win: Electron.BrowserWindow) {
  if (!isUpdaterEnabled()) {
    console.log(
      '[AutoUpdater] Disabled in development. Set EIGENT_ENABLE_DEV_UPDATER=1 to enable it.'
    );
    return;
  }

  const devUpdaterEnabled = isDevUpdaterEnabled();

  // When set to false, the update download will be triggered through the API
  autoUpdater.verifyUpdateCodeSignature = false;
  autoUpdater.autoDownload = false;
  autoUpdater.disableWebInstaller = false;
  autoUpdater.allowDowngrade = false;

  autoUpdater.forceDevUpdateConfig = devUpdaterEnabled;

  // start check
  autoUpdater.on('checking-for-update', function () {});
  // update available
  autoUpdater.on('update-available', (arg: UpdateInfo) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('update-can-available', {
        update: true,
        version: app.getVersion(),
        newVersion: arg?.version,
      });
    }
  });
  // update not available
  autoUpdater.on('update-not-available', (arg: UpdateInfo) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('update-can-available', {
        update: false,
        version: app.getVersion(),
        newVersion: arg?.version,
      });
    }
  });
  console.log('Current version:', autoUpdater.currentVersion.version);
  console.log('Update config path:', autoUpdater.getUpdateConfigPath?.());
  console.log('User data path (where config lives):', app.getPath('userData'));
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify();
  }
  const feed = {
    provider: 'github',
    owner: 'eigent-ai',
    repo: 'eigent',
    releaseType: 'release',
    channel:
      process.platform === 'darwin'
        ? process.arch === 'arm64'
          ? 'latest-arm64'
          : 'latest-x64'
        : 'latest',
  };

  autoUpdater.setFeedURL(feed);
  if (!app.isPackaged) {
    console.log('[DEV] setFeedURL:', feed);
    // In development, check for updates but don't fail if it errors
    autoUpdater.checkForUpdates().catch((err: Error) => {
      console.log(
        '[DEV] Update check failed (expected in dev environment):',
        err.message
      );
    });
  }

  // Handle errors globally to prevent crashes
  autoUpdater.on('error', (error: Error) => {
    console.error('[AutoUpdater] Update error:', error.message);
    // Don't crash the app on update errors
  });
}

/**
 * Registers update-related IPC handlers
 * Should be called once when the app starts
 */
export function registerUpdateIpcHandlers() {
  // Checking for updates - errors are silent since users can't act on them
  ipcMain.handle('check-update', async () => {
    if (!isUpdaterEnabled()) {
      return null;
    }
    try {
      return await autoUpdater.checkForUpdatesAndNotify();
    } catch (error) {
      console.log(
        '[AutoUpdater] Update check failed:',
        (error as Error).message
      );
      return null;
    }
  });

  // Start downloading and feedback on progress
  ipcMain.handle('start-download', (event: Electron.IpcMainInvokeEvent) => {
    if (!isUpdaterEnabled()) {
      return null;
    }
    startDownload(
      (error, progressInfo) => {
        if (error) {
          // feedback download error message
          if (!event.sender.isDestroyed()) {
            event.sender.send('update-error', {
              message: error.message,
              error,
            });
          }
        } else {
          // feedback update progress message
          if (!event.sender.isDestroyed()) {
            event.sender.send('download-progress', progressInfo);
          }
        }
      },
      () => {
        // feedback update downloaded message
        if (!event.sender.isDestroyed()) {
          event.sender.send('update-downloaded');
        }
      }
    );
  });

  // Install now
  ipcMain.handle('quit-and-install', () => {
    if (!isUpdaterEnabled()) {
      return null;
    }
    autoUpdater.quitAndInstall(false, true);
  });
}

function startDownload(
  callback: (error: Error | null, info: ProgressInfo | null) => void,
  complete: (event: UpdateDownloadedEvent) => void
) {
  autoUpdater.on('download-progress', (info: ProgressInfo) =>
    callback(null, info)
  );
  autoUpdater.on('error', (error: Error) => callback(error, null));
  autoUpdater.on('update-downloaded', complete);
  autoUpdater.downloadUpdate();
}


