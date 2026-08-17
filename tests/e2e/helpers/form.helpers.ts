import { Locator, Page, expect } from '@playwright/test';

export async function closeBlockingModalsIfPresent(page: Page): Promise<void> {
  const possibleButtons: Locator[] = [
    page.getByRole('button', { name: /accept|agree|allow|ok/i }).first(),
    page.getByRole('button', { name: /close|fechar|x/i }).first(),
    page.locator('#onetrust-accept-btn-handler').first(),
    page.locator('.onetrust-close-btn-handler').first(),
    page.locator('[aria-label="Close"]').first(),
    page.locator('[data-testid="close"]').first(),
  ];

  for (const button of possibleButtons) {
    try {
      if (await button.count()) {
        if (await button.isVisible({ timeout: 1000 }).catch(() => false)) {
          await button.click({ timeout: 2000 }).catch(() => {});
          await page.waitForTimeout(500);
        }
      }
    } catch {
      // intentionally ignore
    }
  }
}

export async function waitForQuoteFormContainer(page: Page): Promise<Locator> {
  const candidates: Locator[] = [
    page.locator('.digioh-form').first(),
    page.locator('.aem-GridColumn.digioh-form').first(),
    page.locator('.aem-GridColumn--default--12.digioh-form').first(),
    page.locator('[class*="digioh-form"]').first(),
    page.locator('form').first(),
  ];

  for (const candidate of candidates) {
    try {
      if (await candidate.count()) {
        await expect(candidate).toBeVisible({ timeout: 10000 });
        return candidate;
      }
    } catch {
      // try next candidate
    }
  }

  throw new Error(
    'Quote form container not found. Checked selectors: .digioh-form, .aem-GridColumn.digioh-form, [class*="digioh-form"], form'
  );
}

export async function fillFirstVisibleField(
  page: Page,
  patterns: RegExp[],
  value: string
): Promise<boolean> {
  for (const pattern of patterns) {
    const byLabel = page.getByLabel(pattern).first();

    if (await byLabel.count()) {
      if (await byLabel.isVisible().catch(() => false)) {
        await byLabel.fill(value);
        return true;
      }
    }

    const byPlaceholder = page.getByPlaceholder(pattern).first();
    if (await byPlaceholder.count()) {
      if (await byPlaceholder.isVisible().catch(() => false)) {
        await byPlaceholder.fill(value);
        return true;
      }
    }
  }

  return false;
}

export async function selectFirstVisibleOption(
  page: Page,
  patterns: RegExp[],
  optionIndex = 1
): Promise<boolean> {
  for (const pattern of patterns) {
    const locator = page.getByLabel(pattern).first();

    if (await locator.count()) {
      if (await locator.isVisible().catch(() => false)) {
        await locator.selectOption({ index: optionIndex });
        return true;
      }
    }
  }

  return false;
}

export async function checkFirstVisibleCheckbox(
  page: Page,
  patterns: RegExp[]
): Promise<boolean> {
  for (const pattern of patterns) {
    const locator = page.getByLabel(pattern).first();

    if (await locator.count()) {
      if (await locator.isVisible().catch(() => false)) {
        await locator.check();
        return true;
      }
    }
  }

  return false;
}

export async function clickSubmitButton(page: Page): Promise<void> {
  const candidates: Locator[] = [
    page.getByRole('button', { name: /submit|get a quote|send|request|soumettre|envoyer/i }).first(),
    page.locator('button[type="submit"]').first(),
    page.locator('input[type="submit"]').first(),
  ];

  for (const button of candidates) {
    if (await button.count()) {
      if (await button.isVisible().catch(() => false)) {
        await button.click();
        return;
      }
    }
  }

  throw new Error('Submit button not found.');
}

export async function expectFormToBeVisible(page: Page): Promise<void> {
  await closeBlockingModalsIfPresent(page);
  await waitForQuoteFormContainer(page);
}

export async function fillQuoteFormBasicData(
  page: Page,
  data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    postalCode: string;
  }
): Promise<void> {
  await fillFirstVisibleField(page, [/first name|given name|prénom/i], data.firstName);
  await fillFirstVisibleField(page, [/last name|surname|nom/i], data.lastName);
  await fillFirstVisibleField(page, [/email|courriel/i], data.email);
  await fillFirstVisibleField(page, [/phone|telephone|téléphone/i], data.phone);
  await fillFirstVisibleField(page, [/postal|zip|code postal/i], data.postalCode);

  await selectFirstVisibleOption(page, [/model|product|vehicle|modèle/i], 1);
  await selectFirstVisibleOption(page, [/dealer|concessionnaire/i], 1);

  await checkFirstVisibleCheckbox(
    page,
    [/privacy|consent|dealer|confidentialité|consentement/i]
  );
}