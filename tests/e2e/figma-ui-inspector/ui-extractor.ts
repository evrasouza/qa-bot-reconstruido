/// <reference lib="dom" />

import { chromium } from '@playwright/test';

import { UI_TEXT_SELECTORS } from './config';
import {
  closeBlockingModalsIfPresent,
  settlePageForInspection,
} from './browser-helpers';

import type { UiElement, Viewport } from './types';

export async function extractUiElementsFromBrowser(params: {
  url: string;
  selector: string;
  viewport: Viewport;
  screenshotPath: string;
}): Promise<UiElement[]> {
  console.log('Launching browser...');

  const browser = await chromium.launch({
    headless: true,
  });

  const page = await browser.newPage({
    viewport: params.viewport,
  });

  console.log(`Opening page: ${params.url}`);

  await page.goto(params.url, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });

  console.log(`Current page URL after load: ${page.url()}`);
  console.log('Page loaded. Waiting for AEM scripts and closing blockers...');
  await settlePageForInspection(page, 5000);
  console.log(`Looking for component with selector: ${params.selector}`);

  const component = page.locator(params.selector).first();

  try {
    await component.waitFor({
      state: 'visible',
      timeout: 30000,
    });
    console.log('Component successfully found and visible!');
  } catch (error) {
    await page.screenshot({ path: './failed-page-state.png', fullPage: true });
    console.error('⚠️ O componente não apareceu na tela. Um print do estado atual da página foi salvo em "./failed-page-state.png".');
    await browser.close();
    throw error;
  }

  console.log('Component found. Waiting for content stability...');
  await page.waitForTimeout(2000);

  console.log('Closing blockers before screenshot...');
  await closeBlockingModalsIfPresent(page);

  await component.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(500);

  console.log('Taking screenshot...');
  await component.screenshot({
    path: params.screenshotPath,
  });

  console.log('Extracting UI elements...');

  const elements = await component.evaluate(
    (root, selectors) => {
      function cleanText(value: string | null | undefined): string {
        return value?.replace(/\s+/g, ' ').trim() || '';
      }

      function getElementInfo(element: Element) {
        const htmlElement = element as HTMLElement;
        const style = window.getComputedStyle(htmlElement);
        const rect = htmlElement.getBoundingClientRect();

        const inputValue =
          element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement
            ? element.value
            : null;

        const rawText = cleanText(
          inputValue ||
            htmlElement.innerText ||
            htmlElement.textContent ||
            element.getAttribute('value') ||
            element.getAttribute('alt') ||
            element.getAttribute('aria-label') ||
            ''
        );

        return {
          source: 'ui' as const,

          tagName: element.tagName.toLowerCase(),

          className: htmlElement.className || null,

          text: rawText,

          visible:
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            rect.width > 0 &&
            rect.height > 0,

          href:
            element instanceof HTMLAnchorElement
              ? element.href
              : element.getAttribute('src') || null,

          value:
            element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement
              ? element.value
              : null,

          name: element.getAttribute('name') || element.getAttribute('aria-label'),

          styles: {
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            lineHeight: style.lineHeight,
            color: style.color,
            backgroundColor: style.backgroundColor,
          },

          position: {
            x: Number(rect.x.toFixed(2)),
            y: Number(rect.y.toFixed(2)),
            width: Number(rect.width.toFixed(2)),
            height: Number(rect.height.toFixed(2)),
          },
        };
      }

      const domElements = Array.from(root.querySelectorAll(selectors))
        .map((element) => getElementInfo(element))
        .filter((item) => {
          return (item.text || item.tagName === 'img') && item.visible;
        });

      return domElements;
    },
    UI_TEXT_SELECTORS
  );

  await page.waitForTimeout(1000);

  await browser.close();

  return elements;
}
