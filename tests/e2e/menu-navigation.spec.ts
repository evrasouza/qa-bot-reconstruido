import { test } from '@playwright/test';
import { getExecutionConfig } from './config/menu-navigation.config';
import {
  clickMenuItemAndValidate,
  collectNavbarMenuItems,
  openHomePage,
} from './helpers/menu-navigation.helpers';
import { allure } from 'allure-playwright';

const executionConfig = getExecutionConfig();
const executionName = `${executionConfig.baseURL} | ${executionConfig.locale}`;

test.describe(`Navbar menu navigation | ${executionName}`, () => {
  test.use({
    baseURL: executionConfig.baseURL,
  });

  test(`should open each visible menu item from navbar-nav and validate the opened page | ${executionName}`, async ({ page }, testInfo) => {
    test.setTimeout(180000);

    await allure.label('baseUrl', executionConfig.baseURL);
    await allure.label('locale', executionConfig.locale);
    await allure.parameter('baseURL', executionConfig.baseURL);
    await allure.parameter('locale', executionConfig.locale);
    await allure.suite(executionConfig.locale);
    await allure.feature(executionConfig.baseURL);

    const startUrl = await openHomePage(page, executionConfig.baseURL, executionConfig.locale);

    await testInfo.attach('menu-navigation-context.json', {
      body: JSON.stringify(
        {
          baseURL: executionConfig.baseURL,
          locale: executionConfig.locale,
          startUrl,
          menuContainerSelector: executionConfig.menuContainerSelector,
        },
        null,
        2
      ),
      contentType: 'application/json',
    });

    const menuItems = await collectNavbarMenuItems(page, executionConfig.menuContainerSelector);

    await testInfo.attach('discovered-menu-items.json', {
      body: JSON.stringify(menuItems, null, 2),
      contentType: 'application/json',
    });

    test.skip(
      menuItems.length === 0,
      `No menu items were found inside selector ${executionConfig.menuContainerSelector}`
    );

    for (const item of menuItems) {
      await test.step(`Navigate using menu item: ${item.text}`, async () => {
        await openHomePage(page, executionConfig.baseURL, executionConfig.locale);

        await clickMenuItemAndValidate(
          page,
          executionConfig.menuContainerSelector,
          item
        );

        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1200);

        await testInfo.attach(
          `menu-result-${item.text.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`,
          {
            body: JSON.stringify(
              {
                text: item.text,
                href: item.href,
                absoluteUrl: item.absoluteUrl,
                finalUrl: page.url(),
              },
              null,
              2
            ),
            contentType: 'application/json',
          }
        );

        await testInfo.attach(
          `menu-screenshot-${item.text.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`,
          {
            body: await page.screenshot({ fullPage: true }),
            contentType: 'image/png',
          }
        );
      });
    }
  });
});