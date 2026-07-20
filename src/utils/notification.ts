import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import type { NotificationMode } from '../types';
import { playSound, type SoundType } from './sound';

export type AlertType = 'timerStart' | 'segmentEnd' | 'timerEnd';

export async function notify(
  title: string,
  body: string,
  mode: NotificationMode,
  soundType: SoundType,
  soundEnabled: boolean,
  notificationsEnabled: boolean,
): Promise<void> {
  if (!notificationsEnabled || mode === 'silent') {
    return;
  }

  const shouldPlaySound = soundEnabled && mode !== 'tray';

  if (shouldPlaySound) {
    await playSound(soundType);
  }

  if (mode === 'banner') {
    try {
      await invoke('send_notification', { title, body });
    } catch (error) {
      console.error('Failed to send notification:', error);
      toast(title, { description: body });
    }
  } else if (mode === 'tray') {
    toast(title, { description: body });
  }
}

export async function playAlertSound(type: AlertType, enabled: boolean): Promise<void> {
  if (!enabled) return;
  await playSound(type);
}
