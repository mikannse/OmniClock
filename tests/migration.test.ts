import { describe, it, expect } from 'vitest';
import { CURRENT_DATA_VERSION, migrate, wrapVersioned } from '../src/utils/migration';

describe('migration', () => {
  describe('wrapVersioned', () => {
    it('wraps data with current version', () => {
      const wrapped = wrapVersioned({ foo: 'bar' });
      expect(wrapped.version).toBe(CURRENT_DATA_VERSION);
      expect(wrapped.data).toEqual({ foo: 'bar' });
    });
  });

  describe('migrate', () => {
    it('returns null for non-object input', () => {
      expect(migrate(null, {}, () => false)).toBeNull();
      expect(migrate('string', {}, () => false)).toBeNull();
      expect(migrate(123, {}, () => false)).toBeNull();
    });

    it('returns data from versioned wrapper when valid', () => {
      const result = migrate(
        { version: CURRENT_DATA_VERSION, data: ['a', 'b'] },
        {},
        (data): data is string[] => Array.isArray(data) && data.every((item) => typeof item === 'string'),
      );
      expect(result).toEqual(['a', 'b']);
    });

    it('migrates legacy unversioned data', () => {
      const result = migrate(
        { value: 42 },
        {
          2: (data) => {
            const d = data as { value: number };
            return { value: d.value * 2 };
          },
        },
        (data): data is { value: number } =>
          !!data && typeof data === 'object' && typeof (data as { value: unknown }).value === 'number',
      );
      expect(result).toEqual({ value: 84 });
    });

    it('runs migrations up to current version', () => {
      const result = migrate(
        { version: 1, data: { count: 1 } },
        {
          2: (data) => {
            const d = data as { count: number };
            return { count: d.count + 1 };
          },
        },
        (data): data is { count: number } =>
          !!data && typeof data === 'object' && typeof (data as { count: unknown }).count === 'number',
      );
      expect(result).toEqual({ count: 2 });
    });

    it('returns null when validation fails', () => {
      const result = migrate(
        { version: CURRENT_DATA_VERSION, data: 'invalid' },
        {},
        (data): data is number[] => Array.isArray(data) && data.every((item) => typeof item === 'number'),
      );
      expect(result).toBeNull();
    });
  });
});
