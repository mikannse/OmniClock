import { describe, it, expect } from 'vitest';
import {
  formatTime,
  formatTimeWithHours,
  generateId,
  minutesToSeconds,
  calculateTotalSeconds,
} from '../src/utils/time';

describe('time utils', () => {
  describe('formatTime', () => {
    it('formats seconds as mm:ss', () => {
      expect(formatTime(65)).toBe('01:05');
      expect(formatTime(0)).toBe('00:00');
      expect(formatTime(59)).toBe('00:59');
    });

    it('formats hours as hh:mm:ss', () => {
      expect(formatTime(3661)).toBe('01:01:01');
      expect(formatTime(3600)).toBe('01:00:00');
    });
  });

  describe('formatTimeWithHours', () => {
    it('always includes hours', () => {
      expect(formatTimeWithHours(65)).toBe('00:01:05');
      expect(formatTimeWithHours(3661)).toBe('01:01:01');
    });
  });

  describe('minutesToSeconds', () => {
    it('converts minutes to seconds', () => {
      expect(minutesToSeconds(5)).toBe(300);
      expect(minutesToSeconds(0)).toBe(0);
      expect(minutesToSeconds(1.5)).toBe(90);
    });
  });

  describe('calculateTotalSeconds', () => {
    it('sums segment minutes', () => {
      expect(
        calculateTotalSeconds([
          { minutes: 1 },
          { minutes: 2 },
          { minutes: 3 },
        ]),
      ).toBe(360);
    });

    it('returns 0 for empty array', () => {
      expect(calculateTotalSeconds([])).toBe(0);
    });
  });

  describe('generateId', () => {
    it('returns a non-empty string', () => {
      const id = generateId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('returns unique values', () => {
      const ids = new Set(Array.from({ length: 10 }, generateId));
      expect(ids.size).toBe(10);
    });
  });
});
