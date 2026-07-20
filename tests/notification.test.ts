import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { notify, playAlertSound } from '../src/utils/notification';

const invokeMock = vi.fn();
const toastMock = vi.fn();
const playSoundMock = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

vi.mock('sonner', () => ({
  toast: (...args: unknown[]) => toastMock(...args),
}));

vi.mock('../src/utils/sound', () => ({
  playSound: (...args: unknown[]) => playSoundMock(...args),
}));

describe('notification dispatcher', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockResolvedValue(undefined);
    toastMock.mockReset();
    playSoundMock.mockReset();
    playSoundMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('notify', () => {
    it('does nothing in silent mode', async () => {
      await notify('Title', 'Body', 'silent', 'timerEnd', true, true);
      expect(invokeMock).not.toHaveBeenCalled();
      expect(playSoundMock).not.toHaveBeenCalled();
      expect(toastMock).not.toHaveBeenCalled();
    });

    it('does nothing when notifications are disabled', async () => {
      await notify('Title', 'Body', 'banner', 'timerEnd', true, false);
      expect(invokeMock).not.toHaveBeenCalled();
      expect(playSoundMock).not.toHaveBeenCalled();
      expect(toastMock).not.toHaveBeenCalled();
    });

    it('plays sound and sends notification in banner mode', async () => {
      await notify('Title', 'Body', 'banner', 'timerEnd', true, true);
      expect(playSoundMock).toHaveBeenCalledWith('timerEnd');
      expect(invokeMock).toHaveBeenCalledWith('send_notification', { title: 'Title', body: 'Body' });
      expect(toastMock).not.toHaveBeenCalled();
    });

    it('does not play sound when sound is disabled', async () => {
      await notify('Title', 'Body', 'banner', 'timerEnd', false, true);
      expect(playSoundMock).not.toHaveBeenCalled();
      expect(invokeMock).toHaveBeenCalledWith('send_notification', { title: 'Title', body: 'Body' });
    });

    it('does not play sound in tray mode but shows toast', async () => {
      await notify('Title', 'Body', 'tray', 'timerEnd', true, true);
      expect(playSoundMock).not.toHaveBeenCalled();
      expect(invokeMock).not.toHaveBeenCalled();
      expect(toastMock).toHaveBeenCalledWith('Title', { description: 'Body' });
    });

    it('falls back to toast when invoke fails', async () => {
      invokeMock.mockRejectedValue(new Error('notification failed'));
      await notify('Title', 'Body', 'banner', 'timerEnd', true, true);
      expect(invokeMock).toHaveBeenCalled();
      expect(toastMock).toHaveBeenCalledWith('Title', { description: 'Body' });
    });
  });

  describe('playAlertSound', () => {
    it('plays sound when enabled', async () => {
      await playAlertSound('timerStart', true);
      expect(playSoundMock).toHaveBeenCalledWith('timerStart');
    });

    it('does nothing when disabled', async () => {
      await playAlertSound('timerStart', false);
      expect(playSoundMock).not.toHaveBeenCalled();
    });
  });
});
