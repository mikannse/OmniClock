import { useCallback, useState } from 'react';
import { ask, message } from '@tauri-apps/plugin-dialog';
import { check } from '@tauri-apps/plugin-updater';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';

interface UpdateInfo {
  available: boolean;
  version?: string;
  body?: string;
}

export function useUpdateCheck() {
  const { t } = useTranslation();
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  const checkForUpdates = useCallback(async () => {
    setChecking(true);
    setDownloadProgress(0);

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
          setDownloading(true);
          let totalLength = 0;
          let downloadedLength = 0;

          try {
            await update.downloadAndInstall((event) => {
              switch (event.event) {
                case 'Started':
                  totalLength = event.data.contentLength ?? 0;
                  downloadedLength = 0;
                  setDownloadProgress(0);
                  break;
                case 'Progress':
                  downloadedLength += event.data.chunkLength;
                  if (totalLength > 0) {
                    setDownloadProgress(
                      Math.min(100, Math.round((downloadedLength / totalLength) * 100)),
                    );
                  }
                  break;
                case 'Finished':
                  setDownloadProgress(100);
                  break;
              }
            });

            const shouldRelaunch = await ask(
              t('updater.relaunchBody'),
              { title: t('updater.relaunchTitle'), kind: 'info' },
            );

            if (shouldRelaunch) {
              await invoke('relaunch_app');
            }
          } catch (downloadError) {
            console.error('Download failed:', downloadError);
            await message(
              t('updater.downloadFailedBody', { error: String(downloadError) }),
              { title: t('updater.downloadFailedTitle'), kind: 'error' },
            );
          } finally {
            setDownloading(false);
            setDownloadProgress(0);
          }
        }
      } else {
        setUpdateInfo({ available: false });
        await message(t('updater.noUpdateBody'), {
          title: t('updater.noUpdateTitle'),
          kind: 'info',
        });
      }
    } catch (error) {
      console.error('Failed to check for updates:', {
        raw: error,
        stringified: String(error),
        ...(error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
              cause: (error as Error & { cause?: unknown }).cause,
            }
          : {}),
      });
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

  return { checking, downloading, downloadProgress, updateInfo, checkForUpdates };
}
