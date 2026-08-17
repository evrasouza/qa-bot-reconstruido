import type { Locator, Page } from '@playwright/test';

export async function closeBlockingModalsIfPresent(page: Page): Promise<void> {
  const possibleButtons: Locator[] = [
    page.locator('#onetrust-accept-btn-handler').first(),
    page.locator('#onetrust-reject-all-handler').first(),
    page.locator('.onetrust-close-btn-handler').first(),

    page.getByRole('button', { name: /accept all/i }).first(),
    page.getByRole('button', { name: /accept/i }).first(),
    page.getByRole('button', { name: /agree/i }).first(),
    page.getByRole('button', { name: /allow all/i }).first(),
    page.getByRole('button', { name: /allow/i }).first(),
    page.getByRole('button', { name: /ok/i }).first(),
    page.getByRole('button', { name: /got it/i }).first(),

    page.getByRole('button', { name: /accepter/i }).first(),
    page.getByRole('button', { name: /aceptar/i }).first(),
    page.getByRole('button', { name: /hyväksy/i }).first(),
    page.getByRole('button', { name: /godta/i }).first(),
    page.getByRole('button', { name: /accetta/i }).first(),

    page.getByRole('button', { name: /close/i }).first(),
    page.getByRole('button', { name: /fechar/i }).first(),
    page.getByRole('button', { name: /^x$/i }).first(),

    page.locator('[aria-label="Close"]').first(),
    page.locator('[aria-label="close"]').first(),
    page.locator('[class*="close"]').first(),
    page.locator('[class*="modal"] [class*="close"]').first(),
    page.locator('[class*="newsletter"] [class*="close"]').first(),
    page.locator('button').filter({ hasText: /^×$/ }).first(),
  ];

  for (const button of possibleButtons) {
    try {
      const count = await button.count().catch(() => 0);
      if (!count) continue;

      const visible = await button.isVisible().catch(() => false);
      if (!visible) continue;

      await button.click({
        timeout: 2500,
        force: true,
      }).catch(() => {});

      await page.waitForTimeout(400);
    } catch {
      // ignore
    }
  }

  await removeBlockingOverlays(page);
}

export async function removeBlockingOverlays(page: Page): Promise<void> {
  await page.evaluate(() => {
    const selectors = [
      '#onetrust-banner-sdk',
      '.onetrust-pc-dark-filter',
      '.ot-sdk-container',
      '.ot-sdk-row',
      '[id*="onetrust"]',
      '[class*="newsletter"]',
      '[class*="Newsletter"]',
      '[class*="modal-backdrop"]',
      '[class*="overlay"]',
      '[class*="popup"]',
    ];

    for (const selector of selectors) {
      document.querySelectorAll(selector).forEach((element) => {
        const htmlElement = element as HTMLElement;

        const text = htmlElement.innerText?.toLowerCase() || '';
        const className = htmlElement.className?.toString().toLowerCase() || '';
        const id = htmlElement.id?.toLowerCase() || '';

        const looksBlocking =
          id.includes('onetrust') ||
          className.includes('onetrust') ||
          className.includes('newsletter') ||
          className.includes('modal') ||
          className.includes('overlay') ||
          className.includes('popup') ||
          text.includes('cookie') ||
          text.includes('newsletter') ||
          text.includes('subscribe');

        if (looksBlocking) {
          htmlElement.remove();
        }
      });
    }

    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
  }).catch(() => {});
}

export async function settlePageForInspection(page: Page, ms = 1200): Promise<void> {
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(ms);
  await closeBlockingModalsIfPresent(page);
  await page.waitForTimeout(500);
  await closeBlockingModalsIfPresent(page);
}