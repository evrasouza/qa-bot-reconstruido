import { DeviceType, Viewport } from './types';

export const VIEWPORTS: Record<DeviceType, Viewport> = {
  desktop: {
    width: 1440,
    height: 1400,
  },
  tablet: {
    width: 768,
    height: 1200,
  },
  mobile: {
    width: 390,
    height: 844,
  },
};

export const DEFAULT_SELECTOR = '.vinlookup.aem-GridColumn';

export const OUTPUT_DIR = 'ui-inspection-report';

export const UI_TEXT_SELECTORS = [
  'label',
  '[class*="label"]',
  '.vin-lookup-left-panel__last-refresh-date',
  'span',
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'li',
  'a',
  'button',
  '[role="button"]',
  '.btn',
  '[class*="cta"]',
  'input',
  'textarea',
].join(',');
