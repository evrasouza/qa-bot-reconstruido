import { expect, Locator, Page } from '@playwright/test';

export type MenuItem = {
  text: string;
  href: string;
  absoluteUrl: string;
};

export function normalizeBaseUrl(baseURL: string): string {
  return baseURL.replace(/\/+$/, '');
}

export function normalizeLocale(locale: string): string {
  return locale.replace(/^\/+|\/+$/g, '');
}

export function buildStartUrl(baseURL: string, locale: string): string {
  const normalizedBase = normalizeBaseUrl(baseURL);
  const normalizedLocale = normalizeLocale(locale);

  return `${normalizedBase}/${normalizedLocale}/`;
}

export function normalizeComparableUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return url.replace(/\/+$/, '');
  }
}

export async function closeBlockingModalsIfPresent(page: Page): Promise<void> {
  const possibleButtons: Locator[] = [
    // OneTrust mais comum
    page.locator('#onetrust-accept-btn-handler').first(),
    page.locator('#onetrust-reject-all-handler').first(),
    page.locator('.onetrust-close-btn-handler').first(),

    // Botões por texto
    page.getByRole('button', { name: /accept all/i }).first(),
    page.getByRole('button', { name: /accept/i }).first(),
    page.getByRole('button', { name: /agree/i }).first(),
    page.getByRole('button', { name: /allow all/i }).first(),
    page.getByRole('button', { name: /allow/i }).first(),
    page.getByRole('button', { name: /ok/i }).first(),
    page.getByRole('button', { name: /got it/i }).first(),

    // Outras línguas
    page.getByRole('button', { name: /accepter/i }).first(),
    page.getByRole('button', { name: /aceptar/i }).first(),
    page.getByRole('button', { name: /hyväksy/i }).first(),
    page.getByRole('button', { name: /godta/i }).first(),
    page.getByRole('button', { name: /accetta/i }).first(),

    // Fechar genérico
    page.getByRole('button', { name: /close/i }).first(),
    page.getByRole('button', { name: /fechar/i }).first(),
    page.getByRole('button', { name: /^x$/i }).first(),

    // Seletores genéricos
    page.locator('[aria-label="Close"]').first(),
    page.locator('[data-testid="close"]').first(),
    page.locator('[id*="accept"]').first(),
    page.locator('[class*="accept"]').first(),
    page.locator('[id*="consent"]').first(),
    page.locator('[class*="consent"]').first(),
  ];

  for (const button of possibleButtons) {
    try {
      const count = await button.count().catch(() => 0);
      if (!count) continue;

      const visible = await button.isVisible().catch(() => false);
      if (!visible) continue;

      await button.click({ timeout: 3000, force: true }).catch(() => {});
      await page.waitForTimeout(800);
    } catch {
      // ignore
    }
  }

  // tenta esconder overlays comuns, se ainda estiverem visíveis
  const overlaySelectors = [
    '#onetrust-banner-sdk',
    '#onetrust-consent-sdk',
    '.onetrust-pc-dark-filter',
    '.ot-sdk-row',
    '[class*="cookie"]',
    '[id*="cookie"]',
    '[class*="consent"]',
    '[id*="consent"]',
    '[class*="overlay"]',
    '[class*="modal"]'
  ];

  for (const selector of overlaySelectors) {
    try {
      const locator = page.locator(selector).first();
      const count = await locator.count().catch(() => 0);
      if (!count) continue;

      const visible = await locator.isVisible().catch(() => false);
      if (!visible) continue;

      await page.evaluate((sel) => {
        const el = document.querySelector(sel) as HTMLElement | null;
        if (el) {
          el.style.display = 'none';
          el.style.visibility = 'hidden';
          el.style.pointerEvents = 'none';
        }
      }, selector).catch(() => {});
    } catch {
      // ignore
    }
  }
}

export async function openHomePage(
  page: Page,
  baseURL: string,
  locale: string
): Promise<string> {
  const startUrl = buildStartUrl(baseURL, locale);

  await page.goto(startUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await closeBlockingModalsIfPresent(page);

  await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  await expect(page).toHaveTitle(/.+/);

  return startUrl;
}

export async function collectNavbarMenuItems(
  page: Page,
  menuContainerSelector: string
): Promise<MenuItem[]> {
  await closeBlockingModalsIfPresent(page);

  const currentUrl = page.url();

  const items = await page.locator(`${menuContainerSelector} a[href]`).evaluateAll(
    (anchors, pageUrl) => {
      return anchors
        .map((anchor) => {
          const element = anchor as HTMLAnchorElement;
          const href = element.getAttribute('href') || '';
          const text = (element.textContent || '').trim().replace(/\s+/g, ' ');

          let absoluteUrl = '';
          try {
            absoluteUrl = new URL(href, pageUrl as string).toString();
          } catch {
            absoluteUrl = '';
          }

          return {
            text,
            href,
            absoluteUrl,
          };
        })
        .filter((item) => item.href);
    },
    currentUrl
  );

  const currentOrigin = new URL(currentUrl).origin;
  const currentPathPrefix = `/${normalizeLocale(new URL(currentUrl).pathname.split('/').slice(1, 3).join('/'))}`;

  const filtered = items.filter((item) => {
    if (!item.href) return false;
    if (!item.absoluteUrl) return false;
    if (item.href.startsWith('#')) return false;
    if (item.href.startsWith('mailto:')) return false;
    if (item.href.startsWith('tel:')) return false;
    if (item.href.startsWith('javascript:')) return false;

    try {
      const parsed = new URL(item.absoluteUrl);

      const isSameOrigin = parsed.origin === currentOrigin;
      const isSameLocale = parsed.pathname.includes(currentPathPrefix);

      return isSameOrigin && isSameLocale;
    } catch {
      return false;
    }
  });

  const deduped = new Map<string, MenuItem>();

  for (const item of filtered) {
    const key = normalizeComparableUrl(item.absoluteUrl);
    if (!deduped.has(key)) {
      deduped.set(key, {
        text: item.text || item.href,
        href: item.href,
        absoluteUrl: item.absoluteUrl,
      });
    }
  }

  return Array.from(deduped.values());
}

export async function findClickableMenuLocator(
  page: Page,
  menuContainerSelector: string,
  item: MenuItem
): Promise<Locator | null> {
  const hrefCandidates = [
    item.href,
    item.absoluteUrl,
  ].filter(Boolean);

  for (const href of hrefCandidates) {
    const locator = page.locator(`${menuContainerSelector} a[href="${href}"]`).first();
    const count = await locator.count().catch(() => 0);
    if (!count) continue;

    const visible = await locator.isVisible().catch(() => false);
    if (!visible) continue;

    return locator;
  }

  if (item.text) {
    const textLocator = page.locator(menuContainerSelector).getByRole('link', { name: item.text }).first();
    const count = await textLocator.count().catch(() => 0);
    if (count) {
      const visible = await textLocator.isVisible().catch(() => false);
      if (visible) return textLocator;
    }
  }

  return null;
}

export async function clickMenuItemAndValidate(
  page: Page,
  menuContainerSelector: string,
  item: MenuItem
): Promise<void> {
  const beforeUrl = page.url();

  await closeBlockingModalsIfPresent(page);

  const locator = await findClickableMenuLocator(page, menuContainerSelector, item);

  if (!locator) {
    throw new Error(`Menu item not found for click. text="${item.text}" href="${item.href}" absoluteUrl="${item.absoluteUrl}"`);
  }

  await Promise.all([
    page.waitForLoadState('domcontentloaded').catch(() => {}),
    locator.click({ force: true }),
  ]);

  await page.waitForTimeout(1500);
  await closeBlockingModalsIfPresent(page);

  const currentUrl = page.url();
  const expectedUrl = normalizeComparableUrl(item.absoluteUrl);
  const finalUrl = normalizeComparableUrl(currentUrl);
  const previousUrl = normalizeComparableUrl(beforeUrl);

  // valida que a URL mudou
  expect(
    finalUrl,
    `URL did not change after clicking menu item. before=${previousUrl} after=${finalUrl}`
  ).not.toBe(previousUrl);

  // valida que permaneceu no mesmo domínio
  const expectedOrigin = new URL(expectedUrl).origin;
  const finalOrigin = new URL(finalUrl).origin;

  expect(
    finalOrigin,
    `Final URL origin does not match expected origin. expectedOrigin=${expectedOrigin} actualOrigin=${finalOrigin}`
  ).toBe(expectedOrigin);

  // valida que a navegação caiu na mesma grande área do site
  const expectedPathParts = new URL(expectedUrl).pathname.split('/').filter(Boolean);
  const finalPathParts = new URL(finalUrl).pathname.split('/').filter(Boolean);

  // Ex.: /on-road/ca/en/models/can-am-electric-motorcycles.html
  // Prefixo estável: /on-road/ca/en/models
  const expectedStablePrefix = '/' + expectedPathParts.slice(0, 4).join('/');
  const finalPath = '/' + finalPathParts.join('/');

  expect(
    finalPath,
    `Final URL path is outside the expected navigation area. expectedPrefix=${expectedStablePrefix} actualPath=${finalPath}`
  ).toContain(expectedStablePrefix);

  await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  await expect(page).toHaveTitle(/.+/);

  const main = page.locator('main');
  const h1 = page.locator('h1').first();

  const mainCount = await main.count();
  const h1Count = await h1.count();

  expect(
    mainCount > 0 || h1Count > 0,
    `Neither main nor h1 was found on the opened page. finalUrl=${currentUrl}`
  ).toBeTruthy();

  if (mainCount > 0) {
    await expect(main.first()).toBeVisible({ timeout: 10000 });
  }

  if (h1Count > 0) {
    await expect(h1).toBeVisible({ timeout: 10000 });
    const h1Text = (await h1.textContent())?.trim() || '';
    expect(h1Text, `Opened page h1 is empty. finalUrl=${currentUrl}`).not.toBe('');
  }
}