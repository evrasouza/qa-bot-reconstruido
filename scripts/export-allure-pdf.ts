import { chromium } from '@playwright/test';

async function run() {
  const reportUrl = process.env.ALLURE_REPORT_URL || 'http://localhost:8080';

  const browser = await chromium.launch({
    headless: true,
  });

  const page = await browser.newPage({
    viewport: { width: 1600, height: 1200 },
  });

  await page.goto(reportUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });

  await page.waitForSelector('text=Overview', {
    timeout: 60000,
  });

  await page.waitForTimeout(3000);

  await page.pdf({
    path: 'allure-report/allure-report.pdf',
    format: 'A4',
    landscape: true,
    printBackground: true,
  });

  await browser.close();

  console.log('PDF generated: allure-report/allure-report.pdf');
}

run();