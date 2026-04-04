import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart';

export async function setAutostart(enabled: boolean): Promise<void> {
  try {
    if (enabled) {
      await enable();
    } else {
      await disable();
    }
  } catch (error) {
    console.error('Failed to set autostart:', error);
    throw error;
  }
}

export async function getAutostartEnabled(): Promise<boolean> {
  try {
    return await isEnabled();
  } catch (error) {
    console.error('Failed to get autostart status:', error);
    return false;
  }
}
