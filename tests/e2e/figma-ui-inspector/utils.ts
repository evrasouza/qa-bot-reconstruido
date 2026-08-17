import { DeviceType } from './types';

export function getArg(name: string): string | undefined {
  const arg = process.argv.find((item) => item.startsWith(`--${name}=`));
  return arg?.split(`--${name}=`)[1];
}

export function resolveDevice(value?: string): DeviceType {
  if (value === 'desktop' || value === 'tablet' || value === 'mobile') {
    return value;
  }

  return 'desktop';
}

export function sanitizeFileName(value: string): string {
  return value
    .replace(/https?:\/\//, '')
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .slice(0, 80);
}

export function normalizeText(value?: string | null): string {
  return (value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function normalizeFontFamily(value?: string | null): string {
  return (value || '')
    .replace(/["']/g, '')
    .split(',')[0]
    .trim()
    .toLowerCase();
}

export function normalizeColor(value?: string | null): string {
  return (value || '').replace(/\s+/g, '').toLowerCase();
}

export function parsePixelValue(value?: string | number | null): number | null {
  if (value === null || value === undefined) return null;

  if (typeof value === 'number') {
    return value;
  }

  const match = value.match(/[\d.]+/);
  return match ? Number(match[0]) : null;
}