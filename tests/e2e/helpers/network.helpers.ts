import { Page } from '@playwright/test';

export async function blockTrackingRequests(page: Page): Promise<void> {
  const shouldBlockTracking = (process.env.BLOCK_TRACKING || 'true') === 'true';

  if (!shouldBlockTracking) {
    return;
  }

  const blockedPatterns = [
    /googletagmanager\.com/i,
    /google-analytics\.com/i,
    /analytics\.google\.com/i,
    /doubleclick\.net/i,
    /facebook\.net/i,
    /connect\.facebook\.net/i,
    /bat\.bing\.com/i,
    /clarity\.ms/i,
    /hotjar\.com/i,
    /addthis\.com/i,
    /addthisedge\.com/i,
    /googlesyndication\.com/i,
    /googleadservices\.com/i,
    /adservice\.google\.com/i,
    /adsystem\.com/i,
  ];

  await page.route('**/*', async route => {
    const url = route.request().url();
    const shouldBlock = blockedPatterns.some(pattern => pattern.test(url));

    if (shouldBlock) {
      await route.abort();
      return;
    }

    await route.continue();
  });
}