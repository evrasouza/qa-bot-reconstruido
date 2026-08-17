import { expect, Locator, Page } from '@playwright/test';

export function normalizeBaseUrl(baseURL: string): string {
  return baseURL.replace(/\/+$/, '');
}

export function normalizeLocale(locale: string): string {
  return locale.replace(/^\/+|\/+$/g, '');
}

export function buildHomeUrl(baseURL: string, locale: string): string {
  return `${normalizeBaseUrl(baseURL)}/${normalizeLocale(locale)}/`;
}

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
  ];

  for (const button of possibleButtons) {
    try {
      const count = await button.count().catch(() => 0);
      if (!count) continue;

      const visible = await button.isVisible().catch(() => false);
      if (!visible) continue;

      await button.click({ timeout: 2500, force: true }).catch(() => { });
      await page.waitForTimeout(400);
    } catch {
      // ignore
    }
  }
}

async function settlePage(page: Page, ms = 800): Promise<void> {
  await page.waitForLoadState('domcontentloaded').catch(() => { });
  await page.waitForTimeout(ms);
  await closeBlockingModalsIfPresent(page);
}

async function waitForUrlChange(page: Page, previousUrl: string, timeout = 20000): Promise<void> {
  await page.waitForURL(
    url => url.toString() !== previousUrl,
    { timeout, waitUntil: 'commit' }
  );
}

export async function openHomePage(
  page: Page,
  baseURL: string,
  locale: string
): Promise<string> {
  const url = buildHomeUrl(baseURL, locale);

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await settlePage(page, 1200);

  await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  await expect(page).toHaveTitle(/.+/);

  return url;
}

// export async function clickPromotionsFromNavbar(
//   page: Page,
//   menuContainerSelector: string,
//   menuLabel: RegExp
// ): Promise<void> {
//   await closeBlockingModalsIfPresent(page);

//   const beforeUrl = page.url();

//   const candidates: Locator[] = [
//     page.locator(menuContainerSelector).getByRole('link', { name: menuLabel }).first(),
//     page.locator(menuContainerSelector).getByRole('button', { name: menuLabel }).first(),
//     page.locator(`${menuContainerSelector} a`).filter({ hasText: menuLabel }).first(),
//     page.getByRole('link', { name: menuLabel }).first(),
//   ];

//   let target: Locator | null = null;

//   for (const candidate of candidates) {
//     const count = await candidate.count().catch(() => 0);
//     if (!count) continue;

//     const visible = await candidate.isVisible().catch(() => false);
//     if (!visible) continue;

//     target = candidate;
//     break;
//   }

//   if (!target) {
//     throw new Error(`Promotions menu item not found inside ${menuContainerSelector}`);
//   }

//   await target.scrollIntoViewIfNeeded().catch(() => { });
//   await closeBlockingModalsIfPresent(page);

//   await target.click({ force: true });
//   await waitForUrlChange(page, beforeUrl, 20000);
//   await settlePage(page, 1200);
// }


export async function clickPromotionsFromNavbar(
  page: Page,
  menuContainerSelector: string,
  menuLabel: RegExp
): Promise<void> {
  await closeBlockingModalsIfPresent(page);

  const beforeUrl = page.url();

  const candidates: Locator[] = [
    // Melhor opção para multi-idioma: atributo fixo no HTML
    page.locator(`${menuContainerSelector} [label="promotions"]`).first(),
    page.locator(`${menuContainerSelector} a[label="promotions"]`).first(),
    page.locator(`${menuContainerSelector} button[label="promotions"]`).first(),

    // Fallbacks por atributos/data/href
    page.locator(`${menuContainerSelector} [data-label="promotions"]`).first(),
    page.locator(`${menuContainerSelector} a[href*="promotions"]`).first(),
    page.locator(`${menuContainerSelector} a[href*="promociones"]`).first(),
    page.locator(`${menuContainerSelector} a[href*="promotions.html"]`).first(),

    // Fallbacks por texto visível
    page.locator(menuContainerSelector).getByRole('link', { name: menuLabel }).first(),
    page.locator(menuContainerSelector).getByRole('button', { name: menuLabel }).first(),
    page.locator(`${menuContainerSelector} a`).filter({ hasText: menuLabel }).first(),
    page.getByRole('link', { name: menuLabel }).first(),
  ];

  let target: Locator | null = null;

  for (const candidate of candidates) {
    const count = await candidate.count().catch(() => 0);
    if (!count) continue;

    const visible = await candidate.isVisible().catch(() => false);
    if (!visible) continue;

    target = candidate;
    break;
  }

  if (!target) {
    throw new Error(
      [
        'Promotions menu item not found.',
        `menuContainerSelector=${menuContainerSelector}`,
        `menuLabel=${menuLabel}`,
        `currentUrl=${page.url()}`,
      ].join(' | ')
    );
  }

  await target.scrollIntoViewIfNeeded().catch(() => { });
  await closeBlockingModalsIfPresent(page);

  await target.click({ force: true });
  await waitForUrlChange(page, beforeUrl, 20000);
  await settlePage(page, 1200);
}

export async function validatePromotionEntryPage(
  page: Page,
  promoFlowType: 'direct-offers' | 'card-selection',
  year: string,
  setLocationSlug: string
): Promise<void> {
  await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  await expect(page).toHaveTitle(/.+/);

  if (promoFlowType === 'direct-offers') {
    await expect(page).toHaveURL(
      new RegExp(`${setLocationSlug}\\.html\\?year=${year}`),
      { timeout: 15000 }
    );
  } else {
    //await expect(page).toHaveURL(/\/promotions\.html/i, { timeout: 15000 });
  }
}

// export async function validateCardSelectionPageLoaded(page: Page): Promise<void> {
//   await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
//   await expect(page).toHaveTitle(/.+/);
//   //await expect(page).toHaveURL(/\/promotions\.html/i, { timeout: 15000 });
// }

export async function validateCardSelectionPageLoaded(
  page: Page,
  promotionBaseSlug: string
): Promise<void> {
  await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  await expect(page).toHaveTitle(/.+/);

  await expect(page).toHaveURL(
    new RegExp(`/${promotionBaseSlug}\\.html`, 'i'),
    { timeout: 15000 }
  );
}

export async function validateSetLocationPageAfterCardSelection(
  page: Page,
  year: string,
  setLocationSlug: string
): Promise<void> {
  await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  await expect(page).toHaveTitle(/.+/);

  await expect(page).toHaveURL(
    new RegExp(`${setLocationSlug}\\.html\\?year=${year}`),
    { timeout: 15000 }
  );
}

export async function waitForLocationSearchInput(page: Page): Promise<Locator> {
  const inputCandidates: Locator[] = [
    page.locator('input.BRPLocationSearchTextField___input').first(),
    page.locator('input.pac-target-input').first(),
    page.locator('input[placeholder*="ZIP"]').first(),
    page.locator('input[placeholder*="Postal Code"]').first(),
    page.locator('input[placeholder*="Enter"]').first(),
    page.locator('input[type="text"]').first(),
  ];

  for (const candidate of inputCandidates) {
    try {
      await candidate.waitFor({ state: 'visible', timeout: 15000 });
      return candidate;
    } catch {
      // try next
    }
  }

  throw new Error('Location search input was not found or did not become visible.');
}

export async function fillLocationSearch(page: Page, searchText: string): Promise<void> {
  await closeBlockingModalsIfPresent(page);

  const input = await waitForLocationSearchInput(page);

  await input.scrollIntoViewIfNeeded().catch(() => { });
  await input.click({ force: true });
  await input.fill('');
  await input.fill(searchText);

  await page.waitForTimeout(1200);
}

export async function selectFirstAutocompleteOption(page: Page): Promise<void> {
  await closeBlockingModalsIfPresent(page);

  const autocompleteCandidates: Locator[] = [
    page.locator('.pac-container .pac-item').first(),
    page.locator('.pac-item').first(),
    page.locator('[class*="pac-item"]').first(),
    page.locator('[role="option"]').first(),
    page.locator('li[role="option"]').first(),
  ];

  for (const candidate of autocompleteCandidates) {
    const count = await candidate.count().catch(() => 0);
    if (!count) continue;

    const visible = await candidate.isVisible().catch(() => false);
    if (!visible) continue;

    await candidate.scrollIntoViewIfNeeded().catch(() => { });
    await candidate.click({ force: true }).catch(async () => {
      await page.keyboard.press('ArrowDown').catch(() => { });
      await page.keyboard.press('Enter').catch(() => { });
    });

    await page.waitForTimeout(1200);
    return;
  }

  await page.keyboard.press('ArrowDown').catch(() => { });
  await page.waitForTimeout(400);
  await page.keyboard.press('Enter').catch(() => { });
  await page.waitForTimeout(1200);
}

export async function clickViewOffersAfterSearch(page: Page, viewOffersLabel: string): Promise<void> {
  await closeBlockingModalsIfPresent(page);

  const beforeUrl = page.url();

  const viewOffersRegex = new RegExp(
    viewOffersLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    'i'
  );

  const buttonCandidates: Locator[] = [
    page.getByRole('button', { name: viewOffersRegex }).first(),
    page.getByRole('link', { name: viewOffersRegex }).first(),
    page.getByText(viewOffersRegex).first(),
    page.locator('button').filter({ hasText: viewOffersRegex }).first(),
    page.locator('a').filter({ hasText: viewOffersRegex }).first(),
  ];

  let button: Locator | null = null;

  for (const candidate of buttonCandidates) {
    const count = await candidate.count().catch(() => 0);
    if (!count) continue;

    const visible = await candidate.isVisible().catch(() => false);
    if (!visible) continue;

    button = candidate;
    break;
  }

  if (!button) {
    throw new Error(`"${viewOffersLabel}" button was not found after selecting the location.`);
  }

  await button.scrollIntoViewIfNeeded().catch(() => { });
  await button.click({ force: true });

  await waitForUrlChange(page, beforeUrl, 20000);
  await settlePage(page, 1200);
}

export async function validateOffersPageLoaded(
  page: Page,
  year: string
): Promise<void> {
  await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  await expect(page).toHaveTitle(/.+/);

  const currentUrl = page.url();

  expect(
    currentUrl,
    `Expected to leave set-your-location page, but still on: ${currentUrl}`
  ).not.toContain('set-your-location.html');

  expect(
    currentUrl,
    `Expected year=${year} in final URL, but got: ${currentUrl}`
  ).toContain(`year=${year}`);

  const main = page.locator('main');
  const h1 = page.locator('h1').first();

  const mainCount = await main.count();
  const h1Count = await h1.count();

  expect(
    mainCount > 0 || h1Count > 0,
    `Neither main nor h1 was found on the offers page. finalUrl=${currentUrl}`
  ).toBeTruthy();

  if (mainCount > 0) {
    await expect(main.first()).toBeVisible({ timeout: 10000 });
  }

  if (h1Count > 0) {
    await expect(h1).toBeVisible({ timeout: 10000 });
  }
}


export async function clickViewOffersForVehicle(
  page: Page,
  vehicleName: string,
  viewOffersLabel: string
): Promise<void> {
  await closeBlockingModalsIfPresent(page);

  const beforeUrl = page.url();

  const vehicleTitle = page
    .locator('h2, h3, h4, [class*="title"], [class*="name"]')
    .filter({ hasText: new RegExp(`^\\s*${vehicleName}\\s*$`, 'i') })
    .first();

  await expect(
    vehicleTitle,
    `Vehicle title "${vehicleName}" was not found on the offers page.`
  ).toBeVisible({ timeout: 15000 });

  const vehicleCard = vehicleTitle.locator(
    'xpath=ancestor::*[.//a[contains(translate(normalize-space(.), "ABCDEFGHIJKLMNOPQRSTUVWXYZÉ", "abcdefghijklmnopqrstuvwxyzé"), "view offers") or contains(translate(normalize-space(.), "ABCDEFGHIJKLMNOPQRSTUVWXYZÉ", "abcdefghijklmnopqrstuvwxyzé"), "voir les offres")]][1]'
  );

  const viewOffersCta = vehicleCard
    .locator('a, button')
    .filter({ hasText: /view offers|voir les offres/i })
    .first();

  await expect(
    viewOffersCta,
    `View Offers CTA was not found inside vehicle card "${vehicleName}".`
  ).toBeVisible({ timeout: 15000 });

  await viewOffersCta.scrollIntoViewIfNeeded().catch(() => { });
  await viewOffersCta.click({ force: true });

  await page.waitForURL(
    url => url.toString() !== beforeUrl,
    { timeout: 20000, waitUntil: 'commit' }
  ).catch(() => { });

  await page.waitForLoadState('domcontentloaded').catch(() => { });
  await page.waitForTimeout(1200);
  await closeBlockingModalsIfPresent(page);
}

export async function clickOfferDetailsForModel(
  page: Page,
  modelName: string
): Promise<void> {
  await closeBlockingModalsIfPresent(page);

  const modelRegex = new RegExp(modelName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  const modelTitle = page
    .locator('h1, h2, h3, h4, h5, [class*="title"], [class*="name"], [class*="model"]')
    .filter({ hasText: modelRegex })
    .first();

  await expect(
    modelTitle,
    `Model "${modelName}" was not found on the offers page.`
  ).toBeVisible({ timeout: 15000 });

  const modelContainer = modelTitle.locator(
    'xpath=ancestor::*[.//*[contains(translate(normalize-space(.), "ABCDEFGHIJKLMNOPQRSTUVWXYZÉÈÊÀÂÔÛÎÇ", "abcdefghijklmnopqrstuvwxyzéèêàâôûîç"), "offer details") or contains(translate(normalize-space(.), "ABCDEFGHIJKLMNOPQRSTUVWXYZÉÈÊÀÂÔÛÎÇ", "abcdefghijklmnopqrstuvwxyzéèêàâôûîç"), "détails") or contains(translate(normalize-space(.), "ABCDEFGHIJKLMNOPQRSTUVWXYZÉÈÊÀÂÔÛÎÇ", "abcdefghijklmnopqrstuvwxyzéèêàâôûîç"), "details")]][1]'
  );

  const offerDetailsCta = modelContainer
    .locator('a, button')
    .filter({ hasText: /offer details|details|détails|détail/i })
    .first();

  await expect(
    offerDetailsCta,
    `Offer Details CTA was not found inside model "${modelName}" container.`
  ).toBeVisible({ timeout: 15000 });

  await offerDetailsCta.scrollIntoViewIfNeeded().catch(() => { });
  await offerDetailsCta.click({ force: true });

  await page.waitForTimeout(1200);
  await closeBlockingModalsIfPresent(page);

  const detailsOpenedCandidates: Locator[] = [
    page.locator('[class*="modal"]').first(),
    page.locator('[class*="drawer"]').first(),
    page.locator('[class*="bottom-sheet"]').first(),
    page.locator('[class*="disclaimer"]').first(),
    page.getByText(/offer details|details|détails|détail|legal|disclaimer/i).first(),
  ];

  for (const candidate of detailsOpenedCandidates) {
    const count = await candidate.count().catch(() => 0);
    if (!count) continue;

    const visible = await candidate.isVisible().catch(() => false);
    if (visible) {
      await expect(candidate).toBeVisible({ timeout: 10000 });
      return;
    }
  }

  throw new Error(`Clicked Offer Details for "${modelName}", but no details modal/drawer/disclaimer was detected.`);
}

export async function closeOfferDetailsModal(page: Page): Promise<void> {
  const closeCandidates: Locator[] = [
    page.getByRole('button', { name: /close/i }).first(),
    page.getByRole('button', { name: /fechar/i }).first(),
    page.getByRole('button', { name: /^x$/i }).first(),
    page.locator('[aria-label="Close"]').first(),
    page.locator('[aria-label="close"]').first(),
    page.locator('[class*="close"]').first(),
    page.locator('button').filter({ hasText: /^×$/ }).first(),
  ];

  for (const candidate of closeCandidates) {
    const count = await candidate.count().catch(() => 0);
    if (!count) continue;

    const visible = await candidate.isVisible().catch(() => false);
    if (!visible) continue;

    await candidate.click({ force: true }).catch(() => { });
    await page.waitForTimeout(800);
    return;
  }

  // fallback: ESC
  await page.keyboard.press('Escape').catch(() => { });
  await page.waitForTimeout(800);

  // fallback final: clique fora do modal
  await page.mouse.click(20, 20).catch(() => { });
  await page.waitForTimeout(800);
}

// export async function selectPromotionCardByName(
//   page: Page,
//   cardName: string
// ): Promise<void> {
//   await closeBlockingModalsIfPresent(page);

//   const beforeUrl = page.url();
//   const cardRegex = new RegExp(cardName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

//   const cardTitleCandidates: Locator[] = [
//     page.locator('h1, h2, h3, h4, h5').filter({ hasText: cardRegex }).first(),
//     page.locator('[class*="title"], [class*="name"], [class*="card"]').filter({ hasText: cardRegex }).first(),
//     page.getByText(cardRegex).first(),
//   ];

//   let cardTitle: Locator | null = null;

//   for (const candidate of cardTitleCandidates) {
//     const count = await candidate.count().catch(() => 0);
//     if (!count) continue;

//     const visible = await candidate.isVisible().catch(() => false);
//     if (!visible) continue;

//     cardTitle = candidate;
//     break;
//   }

//   if (!cardTitle) {
//     throw new Error(`Promotion card title "${cardName}" was not found.`);
//   }

//   const cardContainer = cardTitle.locator(
//     'xpath=ancestor::*[.//a[contains(@href, "set-your-location") or contains(@href, "/promotions/")]][1]'
//   );

//   const cardLink = cardContainer
//     .locator('a[href*="set-your-location"], a[href*="/promotions/"]')
//     .first();

//   await expect(
//     cardLink,
//     `Promotion card link was not found inside card "${cardName}".`
//   ).toBeVisible({ timeout: 15000 });

//   await cardLink.scrollIntoViewIfNeeded().catch(() => { });
//   await cardLink.click({ force: true });

//   await waitForUrlChange(page, beforeUrl, 20000);
//   await settlePage(page, 1200);
// }

export async function selectPromotionCardByName(
  page: Page,
  cardName: string,
  promotionBaseSlug: string,
  setLocationSlug: string
): Promise<void> {
  await closeBlockingModalsIfPresent(page);

  const beforeUrl = page.url();
  const cardRegex = new RegExp(cardName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  const cardTitleCandidates: Locator[] = [
    page.locator('h1, h2, h3, h4, h5').filter({ hasText: cardRegex }).first(),
    page.locator('[class*="title"], [class*="name"], [class*="card"]').filter({ hasText: cardRegex }).first(),
    page.getByText(cardRegex).first(),
  ];

  let cardTitle: Locator | null = null;

  for (const candidate of cardTitleCandidates) {
    const count = await candidate.count().catch(() => 0);
    if (!count) continue;

    const visible = await candidate.isVisible().catch(() => false);
    if (!visible) continue;

    cardTitle = candidate;
    break;
  }

  if (!cardTitle) {
    throw new Error(`Promotion card title "${cardName}" was not found.`);
  }

  const cardContainer = cardTitle.locator(
    `xpath=ancestor::*[
      .//a[
        contains(@href, "${setLocationSlug}")
        or contains(@href, "/${promotionBaseSlug}/")
        or contains(@href, "${promotionBaseSlug}.html")
      ]
    ][1]`
  );

  const cardLink = cardContainer
    .locator(
      [
        `a[href*="${setLocationSlug}"]`,
        `a[href*="/${promotionBaseSlug}/"]`,
        `a[href*="${promotionBaseSlug}.html"]`,
      ].join(', ')
    )
    .first();

  await expect(
    cardLink,
    `Promotion card link was not found inside card "${cardName}".`
  ).toBeVisible({ timeout: 15000 });

  await cardLink.scrollIntoViewIfNeeded().catch(() => { });
  await cardLink.click({ force: true });

  await waitForUrlChange(page, beforeUrl, 20000);
  await settlePage(page, 1200);
}