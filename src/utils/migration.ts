import { BaseDirectory, rename, writeTextFile } from '@tauri-apps/plugin-fs';

export const CURRENT_DATA_VERSION = 2;

export interface Versioned<T> {
  version: number;
  data: T;
}

export type Migration<T> = (data: unknown) => T;

export function wrapVersioned<T>(data: T): Versioned<T> {
  return { version: CURRENT_DATA_VERSION, data };
}

export function migrate<T>(
  parsed: unknown,
  migrations: Record<number, Migration<T>>,
  validate: (data: unknown) => data is T,
): T | null {
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const record = parsed as Record<string, unknown>;
  const hasVersion = 'version' in record && typeof record.version === 'number';
  const hasData = 'data' in record;

  let version: number = hasVersion ? (record.version as number) : 1;
  let data: unknown = hasData ? record.data : parsed;

  while (version < CURRENT_DATA_VERSION && migrations[version + 1]) {
    data = migrations[version + 1](data);
    version += 1;
  }

  if (!validate(data)) {
    return null;
  }

  return data;
}

export async function writeFileAtomic(filePath: string, content: string): Promise<void> {
  const tempPath = `${filePath}.tmp`;
  await writeTextFile(tempPath, content, { baseDir: BaseDirectory.AppData });
  try {
    await rename(tempPath, filePath, {
      oldPathBaseDir: BaseDirectory.AppData,
      newPathBaseDir: BaseDirectory.AppData,
    });
  } catch (error) {
    console.error('Atomic rename failed, falling back to direct write:', error);
    await writeTextFile(filePath, content, { baseDir: BaseDirectory.AppData });
  }
}
