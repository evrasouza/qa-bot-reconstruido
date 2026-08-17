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

  console.log('Opening page...');

  await page.goto(params.url, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });

  console.log('Page loaded. Waiting for AEM scripts and closing blockers...');

  await settlePageForInspection(page, 5000);

  console.log(`Looking for component: ${params.selector}`);

  const component = page.locator(params.selector).first();

  await component.waitFor({
    state: 'visible',
    timeout: 30000,
  });

  console.log('Component found. Waiting for VIN Lookup dynamic content...');

  await page.waitForTimeout(10000);

  await component
    .locator('cmp-hero-block object-fit-cover ')
    .first()
    .waitFor({
      state: 'attached',
      timeout: 20000,
    })
    .catch(() => {
      console.warn('Last refresh date was not attached.');
    });

  await page
    .waitForFunction(
      () => {
        const element = document.querySelector(
          'cmp-hero-block object-fit-cover '
        );

        return element?.textContent
          ?.toLowerCase()
          .includes('results last updated');
      },
      undefined,
      {
        timeout: 20000,
      }
    )
    .catch(() => {
      console.warn('Last refresh date text was not available.');
    });

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

      function normalizeDynamicText(value: string): string {
        const normalized = value.replace(/\s+/g, ' ').trim();

        if (/results last updated:/i.test(normalized)) {
          return '*Results last updated:';
        }

        return normalized;
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

        let rawText = cleanText(
          inputValue ||
            htmlElement.innerText ||
            htmlElement.textContent ||
            element.getAttribute('value') ||
            ''
        );

        if (
          htmlElement.classList.contains(
            'vin-lookup-left-panel__last-refresh-date'
          ) ||
          htmlElement.className
            .toString()
            .includes('vin-lookup-left-panel__last-refresh-date')
        ) {
          rawText = '*Results last updated:';
        }

        const normalizedDynamicText = normalizeDynamicText(rawText);

        return {
          source: 'ui' as const,

          tagName: element.tagName.toLowerCase(),

          className: htmlElement.className || null,

          text: normalizedDynamicText,

          visible:
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            rect.width > 0 &&
            rect.height > 0,

          href:
            element instanceof HTMLAnchorElement
              ? element.href
              : null,

          value:
            element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement
              ? element.value
              : null,

          name: element.getAttribute('name'),

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

      const urlParams = new URLSearchParams(window.location.search);
      const vinFromUrl = urlParams.get('vin');

      const virtualElements = vinFromUrl
        ? [
            {
              source: 'ui' as const,
              tagName: 'url-param',
              className: 'vin-query-param',
              text: vinFromUrl,
              visible: true,
              href: null,
              value: vinFromUrl,
              name: 'vin',
              styles: {
                fontFamily: null,
                fontSize: null,
                fontWeight: null,
                lineHeight: null,
                color: null,
                backgroundColor: null,
              },
              position: {
                x: 0,
                y: 0,
                width: 0,
                height: 0,
              },
            },
          ]
        : [];

      const lastRefreshElement = root.querySelector(
        'cmp-hero-block object-fit-cover '
      ) as HTMLElement | null;

      const lastRefreshStyle = lastRefreshElement
        ? window.getComputedStyle(lastRefreshElement)
        : null;

      const lastRefreshRect = lastRefreshElement
        ? lastRefreshElement.getBoundingClientRect()
        : null;

      const lastRefreshVirtualElement = lastRefreshElement
        ? [
            {
              source: 'ui' as const,
              tagName: 'h3',
              className: 'vin-lookup-left-panel__last-refresh-date',
              text: '*Results last updated:',
              visible: true,
              href: null,
              value: null,
              name: null,
              styles: {
                fontFamily: lastRefreshStyle?.fontFamily || null,
                fontSize: lastRefreshStyle?.fontSize || null,
                fontWeight: lastRefreshStyle?.fontWeight || null,
                lineHeight: lastRefreshStyle?.lineHeight || null,
                color: lastRefreshStyle?.color || null,
                backgroundColor:
                  lastRefreshStyle?.backgroundColor || null,
              },
              position: {
                x: lastRefreshRect
                  ? Number(lastRefreshRect.x.toFixed(2))
                  : 0,
                y: lastRefreshRect
                  ? Number(lastRefreshRect.y.toFixed(2))
                  : 0,
                width: lastRefreshRect
                  ? Number(lastRefreshRect.width.toFixed(2))
                  : 0,
                height: lastRefreshRect
                  ? Number(lastRefreshRect.height.toFixed(2))
                  : 0,
              },
            },
          ]
        : [];

      const domElements = Array.from(root.querySelectorAll(selectors))
        .map((element) => getElementInfo(element))
        .filter((item) => {
          if (!item.text) return false;

          if (
            item.className ===
              'vin-lookup-left-panel__last-refresh-date' ||
            item.className
              ?.toString()
              .includes('vin-lookup-left-panel__last-refresh-date')
          ) {
            return true;
          }

          return item.visible;
        });

      return [
        ...domElements,
        ...virtualElements,
        ...lastRefreshVirtualElement,
      ];
    },
    UI_TEXT_SELECTORS
  );

  await page.waitForTimeout(1000);

  await browser.close();

  return elements;
}