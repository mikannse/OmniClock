export type SoundType = 'timerStart' | 'segmentEnd' | 'timerEnd' | 'hover';

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }

  return audioContext;
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
  });
}

export async function playSound(type: SoundType, enabled = true): Promise<void> {
  if (!enabled) {
    return;
  }

  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;

    switch (type) {
      case 'timerStart':
        oscillator.frequency.setValueAtTime(400, now);
        oscillator.frequency.exponentialRampToValueAtTime(600, now + 0.1);
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.25, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        oscillator.start(now);
        oscillator.stop(now + 0.15);
        break;
      case 'segmentEnd': {
        oscillator.frequency.setValueAtTime(800, now);
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
        oscillator.start(now);
        oscillator.stop(now + 0.45);

        const secondOscillator = ctx.createOscillator();
        const secondGain = ctx.createGain();
        secondOscillator.connect(secondGain);
        secondGain.connect(ctx.destination);
        secondOscillator.frequency.setValueAtTime(1000, now + 0.15);
        secondOscillator.type = 'sine';
        secondGain.gain.setValueAtTime(0, now);
        secondGain.gain.setValueAtTime(0.3, now + 0.15);
        secondGain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
        secondOscillator.start(now + 0.15);
        secondOscillator.stop(now + 0.45);
        break;
      }
      case 'timerEnd': {
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((frequency, index) => {
          const noteOscillator = ctx.createOscillator();
          const noteGain = ctx.createGain();
          noteOscillator.connect(noteGain);
          noteGain.connect(ctx.destination);
          noteOscillator.frequency.value = frequency;
          noteOscillator.type = 'sine';
          noteGain.gain.setValueAtTime(0, now + index * 0.15);
          noteGain.gain.linearRampToValueAtTime(0.25, now + index * 0.15 + 0.05);
          noteGain.gain.exponentialRampToValueAtTime(0.01, now + index * 0.15 + 0.3);
          noteOscillator.start(now + index * 0.15);
          noteOscillator.stop(now + index * 0.15 + 0.3);
        });
        break;
      }
      case 'hover':
        oscillator.frequency.setValueAtTime(1200, now);
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.08, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        oscillator.start(now);
        oscillator.stop(now + 0.05);
        break;
    }
  } catch (error) {
    console.error('Failed to play sound:', error);
  }
}
