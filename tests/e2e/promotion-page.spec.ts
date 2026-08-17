import { test, Page, TestInfo } from '@playwright/test';
import { blockTrackingRequests } from './helpers/network.helpers';
import { promotionMatrix } from './config/promotion-matrix';
import {
  clickPromotionsFromNavbar,
  clickViewOffersAfterSearch,
  fillLocationSearch,
  openHomePage,
  selectFirstAutocompleteOption,
  selectPromotionCardByName,
  validateCardSelectionPageLoaded,
  validateOffersPageLoaded,
  validatePromotionEntryPage,
  validateSetLocationPageAfterCardSelection,
  clickViewOffersForVehicle,
  clickOfferDetailsForModel,
  closeOfferDetailsModal,
} from './helpers/promotion-page.helpers';
import {
  getAemDictionary,
  translateFromDictionary,
} from './helpers/aem-i18n.helpers';

const onlyBrand = process.env.ONLY_BRAND?.toLowerCase();

const filteredMatrix = promotionMatrix.filter(config => {
  if (!onlyBrand) return true;
  return config.baseURL.toLowerCase().includes(onlyBrand);
});

function safeFileName(value: string): string {
  return value
    .toLowerCase()
    .replace(/https?:\/\//g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function attachScreenshot(
  page: Page,
  testInfo: TestInfo,
  name: string,
  configName: string
): Promise<void> {
  const screenshot = await page.screenshot({ fullPage: true });

  await testInfo.attach(`${name}-${safeFileName(configName)}.png`, {
    body: screenshot,
    contentType: 'image/png',
  });
}

test.describe.parallel('Promotion Page - Multi Brand Flow', () => {
  for (const config of filteredMatrix) {
    const executionName = `${config.name} | ${config.baseURL} | ${config.locale} | ${config.vehicleType} | ${config.promoFlowType} | year=${config.year}`;

    test(`E2E Promotion Flow | ${executionName}`, async ({ page }, testInfo) => {
      test.setTimeout(120000);

      await blockTrackingRequests(page);

      const dictionary = await getAemDictionary(
        page.request,
        config.dictionaryBaseURL || config.baseURL,
        config.locale
      );

      const viewOffersLabel = translateFromDictionary(dictionary, 'View offers');
      const offerDetailsLabel = translateFromDictionary(dictionary, 'Offer details');
      const setLocationSlug = translateFromDictionary(
        dictionary,
        'url_setYourLocation ((POW))'
      );

      await testInfo.attach('aem-dictionary-labels.json', {
        body: JSON.stringify(
          {
            locale: config.locale,
            viewOffersLabel,
            offerDetailsLabel,
            setLocationSlug,
          },
          null,
          2
        ),
        contentType: 'application/json',
      });

      await testInfo.attach('promotion-config.json', {
        body: JSON.stringify(config, null, 2),
        contentType: 'application/json',
      });

      await test.step('Open home page', async () => {
        await openHomePage(page, config.baseURL, config.locale);

        await testInfo.attach('home-url.txt', {
          body: page.url(),
          contentType: 'text/plain',
        });

        await attachScreenshot(page, testInfo, '01-home-page', config.name);
      });

      await test.step('Click Promotions in navbar', async () => {
        await clickPromotionsFromNavbar(page, '.navbar-nav', /promotions/i);

        await testInfo.attach('after-click-promotions-url.txt', {
          body: page.url(),
          contentType: 'text/plain',
        });

        await attachScreenshot(
          page,
          testInfo,
          '02-after-click-promotions',
          config.name
        );
      });

      await test.step('Validate promotion entry page', async () => {
        await validatePromotionEntryPage(
          page,
          config.promoFlowType,
          config.year,
          config.setLocationSlug
        );

        await attachScreenshot(
          page,
          testInfo,
          '03-promotion-entry-page',
          config.name
        );
      });

      if (config.promoFlowType === 'card-selection') {
        await test.step('Validate card selection page loaded', async () => {
          //await validateCardSelectionPageLoaded(page);
          await validateCardSelectionPageLoaded(
            page,
            config.promotionBaseSlug
          );

          await attachScreenshot(
            page,
            testInfo,
            '04-card-selection-page',
            config.name
          );
        });

        await test.step('Select first promotion card', async () => {
          //await selectPromotionCardByName(page, config.promotionCardName, config.promotionBaseSlug, config.setLocationSlug);
          await selectPromotionCardByName(
            page,
            config.promotionCardName,
            config.promotionBaseSlug,
            config.setLocationSlug
          );

          await testInfo.attach('after-select-card-url.txt', {
            body: page.url(),
            contentType: 'text/plain',
          });

          await attachScreenshot(
            page,
            testInfo,
            '05-after-select-card',
            config.name
          );
        });

        await test.step('Validate set-your-location page after card selection', async () => {
          await validateSetLocationPageAfterCardSelection(
            page,
            config.year,
            config.setLocationSlug
          );

          await attachScreenshot(
            page,
            testInfo,
            '06-set-location-page',
            config.name
          );
        });
      }

      await test.step(`Fill location search with ${config.searchText}`, async () => {
        await fillLocationSearch(page, config.searchText);

        await attachScreenshot(
          page,
          testInfo,
          '07-after-fill-location',
          config.name
        );
      });

      await test.step('Select first autocomplete option', async () => {
        await selectFirstAutocompleteOption(page);

        await attachScreenshot(
          page,
          testInfo,
          '08-after-select-autocomplete',
          config.name
        );
      });

      await test.step('Click View Offers', async () => {
        await clickViewOffersAfterSearch(page, viewOffersLabel);

        await testInfo.attach('after-view-offers-url.txt', {
          body: page.url(),
          contentType: 'text/plain',
        });

        await attachScreenshot(
          page,
          testInfo,
          '09-after-view-offers',
          config.name
        );
      });

      await test.step('Validate offers page loaded', async () => {
        await validateOffersPageLoaded(page, config.year);

        await testInfo.attach('final-url.txt', {
          body: page.url(),
          contentType: 'text/plain',
        });

        await attachScreenshot(
          page,
          testInfo,
          '10-final-offers-page',
          config.name
        );
      });

      await test.step(`Click View Offers for vehicle ${config.vehicleModelName}`, async () => {
        await clickViewOffersForVehicle(
          page,
          config.vehicleModelName,
          viewOffersLabel
        );

        await testInfo.attach('after-click-vehicle-offers-url.txt', {
          body: page.url(),
          contentType: 'text/plain',
        });

        await attachScreenshot(
          page,
          testInfo,
          '11-after-click-vehicle-offers',
          config.name
        );
      });

      await test.step(`Click offer details for model ${config.offerDetailsModelName}`, async () => {
        await clickOfferDetailsForModel(
          page,
          config.offerDetailsModelName,
          offerDetailsLabel
        );

        await testInfo.attach('after-click-offer-details-url.txt', {
          body: page.url(),
          contentType: 'text/plain',
        });

        await attachScreenshot(
          page,
          testInfo,
          '12-after-click-offer-details',
          config.name
        );
      });

      await test.step('Close offer details modal', async () => {
        await closeOfferDetailsModal(page);

        await attachScreenshot(
          page,
          testInfo,
          '13-after-close-offer-details',
          config.name
        );
      });
    });
  }
});