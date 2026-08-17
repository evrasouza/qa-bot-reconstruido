import { APIRequestContext } from '@playwright/test';

export type AemDictionary = Record<string, string>;

export function getDictionaryLocale(locale: string): string {
  const normalized = locale.toLowerCase();

  if (normalized === 'ca/fr') return 'fr-CA';
  if (normalized === 'ca/en') return 'en-CA';
  if (normalized === 'us/en') return 'en-US';
  if (normalized === 'br/pt') return 'pt-BR';
  if (normalized === 'it/it') return 'it-IT';
  if (normalized === 'fi/fi') return 'fi-FI';
  if (normalized === 'fi/en') return 'en-FI';
  if (normalized === 'no/en') return 'en-NO';

  return 'en-CA';
}

export async function getAemDictionary(
  request: APIRequestContext,
  baseURL: string,
  locale: string
): Promise<AemDictionary> {
  const normalizedBase = baseURL.replace(/\/+$/, '');
  const dictionaryLocale = getDictionaryLocale(locale);
  const dictionaryUrl = `${normalizedBase}/libs/cq/i18n/dict.${dictionaryLocale}.json`;

  const response = await request.get(dictionaryUrl, {
    failOnStatusCode: false,
  });

  if (!response.ok()) {
    throw new Error(
      `Could not load AEM dictionary. url=${dictionaryUrl} status=${response.status()}`
    );
  }

  return response.json();
}

export function translateFromDictionary(
  dictionary: AemDictionary,
  key: string
): string {
  return dictionary[key] || key;
}

export function regexFromLabel(label: string): RegExp {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped, 'i');
}
