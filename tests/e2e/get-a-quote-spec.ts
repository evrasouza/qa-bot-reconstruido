import { test, expect } from '@playwright/test';
import { quoteFormConfigs } from './config/quote-form.config';
import {
  clickSubmitButton,
  expectFormToBeVisible,
  fillFirstVisibleField,
  fillQuoteFormBasicData,
  closeBlockingModalsIfPresent,
  waitForQuoteFormContainer,
} from './helpers/form.helpers';

for (const config of quoteFormConfigs) {
  test.describe(`Get a Quote - ${config.name}`, () => {
    test.use({ baseURL: config.baseURL });

    test.skip('should render the quote page and form', async ({ page }, testInfo) => {
      const url = `${config.localePath}${config.quotePath}`;

      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await closeBlockingModalsIfPresent(page);

      await testInfo.attach('e2e-config.json', {
        body: JSON.stringify(config, null, 2),
        contentType: 'application/json',
      });

      await expect(
        page.getByRole('heading', { name: config.expectedHeading }).first()
      ).toBeVisible({ timeout: 10000 });

      const container = await waitForQuoteFormContainer(page);

      await testInfo.attach('form-container-debug.json', {
        body: JSON.stringify(
          {
            currentUrl: page.url(),
            foundContainer: await container.evaluate((el) => el.className || el.tagName),
          },
          null,
          2
        ),
        contentType: 'application/json',
      });
    });

    test('should show validation when submitting empty form', async ({ page }) => {
      const url = `${config.localePath}${config.quotePath}`;

      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await closeBlockingModalsIfPresent(page);

      await expect(
        page.getByRole('heading', { name: config.expectedHeading }).first()
      ).toBeVisible({ timeout: 10000 });

      await expectFormToBeVisible(page);

      await clickSubmitButton(page);

      await expect(
        page.getByText(/required|mandatory|please complete|obligatoire|requis/i).first()
      ).toBeVisible({ timeout: 10000 });
    });

    test('should reject invalid email', async ({ page }) => {
      const url = `${config.localePath}${config.quotePath}`;

      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await closeBlockingModalsIfPresent(page);

      await expectFormToBeVisible(page);

      const found = await fillFirstVisibleField(
        page,
        [/email|courriel/i],
        'invalid-email'
      );

      test.skip(!found, 'Email field not found on this page.');

      const emailField = page.getByLabel(/email|courriel/i).first();
      await emailField.blur();

      await expect(
        page.getByText(/invalid email|enter a valid email|email is not valid|courriel invalide/i).first()
      ).toBeVisible({ timeout: 10000 });
    });

    test('should submit valid quote form', async ({ page }, testInfo) => {
      const url = `${config.localePath}${config.quotePath}`;

      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await closeBlockingModalsIfPresent(page);

      await expect(
        page.getByRole('heading', { name: config.expectedHeading }).first()
      ).toBeVisible({ timeout: 10000 });

      await expectFormToBeVisible(page);

      await fillQuoteFormBasicData(page, config.testData);

      await testInfo.attach('submitted-data.json', {
        body: JSON.stringify(config.testData, null, 2),
        contentType: 'application/json',
      });

      await clickSubmitButton(page);

      await expect(
        page.getByText(config.successMessage).first()
      ).toBeVisible({ timeout: 15000 });
    });
  });
}