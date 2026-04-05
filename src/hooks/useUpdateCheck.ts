import { useState, useCallback } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { ask, message } from '@tauri-apps/plugin-dialog';

interface UpdateInfo {
  available: boolean;
  version?: string;
  body?: string;
}

export function useUpdateCheck() {
  const [checking, setChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  const checkForUpdates = useCallback(async () => {
    setChecking(true);
    try {
      const update = await check();
      if (update?.available) {
        setUpdateInfo({
          available: true,
          version: update.version,
          body: update.body,
        });
        const confirmed = await ask(
          `Version ${update.version} is available. Would you like to download and install it now?`,
          { title: 'Update Available', kind: 'info' }
        );
        if (confirmed) {
          await update.downloadAndInstall();
        }
      } else {
        setUpdateInfo({ available: false });
        await message('You are using the latest version.', { title: 'No Update Available', kind: 'info' });
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
      await message(`Failed to check for updates: ${error}`, { title: 'Error', kind: 'error' });
    } finally {
      setChecking(false);
    }
  }, []);

  return { checking, updateInfo, checkForUpdates };
}
