import { useCallback, useState } from 'react';
import { ask, message } from '@tauri-apps/plugin-dialog';
import { check } from '@tauri-apps/plugin-updater';
import { useTranslation } from 'react-i18next';

interface UpdateInfo {
  available: boolean;
  version?: string;
  body?: string;
}

export function useUpdateCheck() {
  const { t } = useTranslation();
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
          t('updater.availableBody', { version: update.version }),
          { title: t('updater.availableTitle'), kind: 'info' },
        );

        if (confirmed) {
          await update.downloadAndInstall();
        }
      } else {
        setUpdateInfo({ available: false });
        await message(t('updater.noUpdateBody'), {
          title: t('updater.noUpdateTitle'),
          kind: 'info',
        });
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
      const errorMessage = String(error);
      const invalidManifest = errorMessage.includes('Could not fetch a valid release JSON from the remote');

      await message(
        invalidManifest ? t('updater.manifestMissingBody') : t('updater.errorBody', { error: errorMessage }),
        {
          title: invalidManifest ? t('updater.manifestMissingTitle') : t('updater.errorTitle'),
          kind: 'error',
        },
      );
    } finally {
      setChecking(false);
    }
  }, [t]);

  return { checking, updateInfo, checkForUpdates };
}
