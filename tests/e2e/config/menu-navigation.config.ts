export type MenuNavigationExecutionConfig = {
  baseURL: string;
  locale: string;
  menuContainerSelector: string;
};

export const SUPPORTED_BASE_URLS = [
  'https://can-am.brp.com',
  'https://can-am.brp.com/off-road',
  'https://can-am.brp.com/on-road',
  'https://sea-doo.brp.com',
  'https://ski-doo.brp.com',
  'https://www.brplynx.com',
];

export const SUPPORTED_LOCALES = [
  'ca/en',
  'ca/fr',
  'us/en',
  'br/pt',
  'no/en',
  'fi/en',
  'fi/fi',
  'it/it',
];

export function getExecutionConfig(): MenuNavigationExecutionConfig {
  const baseURL = process.env.BASE_URL || 'https://can-am.brp.com';
  const locale = process.env.LOCALE || 'ca/en';

  return {
    baseURL,
    locale,
    menuContainerSelector: '.navbar-nav',
  };
}
