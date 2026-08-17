import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const BASE_URLS = [
  'https://can-am.brp.com',
  'https://can-am.brp.com/off-road',
  'https://can-am.brp.com/on-road',
  'https://sea-doo.brp.com',
  'https://ski-doo.brp.com',
  'https://www.brplynx.com',
];

const LOCALES = [
  'ca/en',
  'ca/fr',
  'us/en',
  'br/pt',
  'no/en',
  'fi/en',
  'fi/fi',
  'it/it',
];

function safeRm(targetPath: string) {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
}

function run() {
  const allureResultsDir = path.join(process.cwd(), 'allure-results');

  // limpa uma vez só no começo
  // safeRm(allureResultsDir);

  // prepara metadata uma vez
  // execSync(`node scripts/prepare-allure.js`, { stdio: 'inherit' });

  for (const baseURL of BASE_URLS) {
    for (const locale of LOCALES) {
      console.log('\n========================================');
      console.log(`Running: ${baseURL} | ${locale}`);
      console.log('========================================\n');

      try {
        execSync(
          `BASE_URL="${baseURL}" LOCALE="${locale}" npx playwright test --project=e2e tests/e2e/menu-navigation.spec.ts`,
          { stdio: 'inherit' }
        );
      } catch (error) {
        console.log(`❌ Failed for ${baseURL} | ${locale}`);
      }
    }
  }

  console.log('\n✅ Finished running all menu combinations.');
  console.log('Now run: npm run report:allure');
}

run();