const fs = require('fs');
const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, '.env'),
});
const { defineConfig } = require('@playwright/test');

const CRAWLER_DIR = path.join(__dirname, 'crawler-output');

const recordVideo = process.env.VIDEO === 'true';

const domains = fs.existsSync(CRAWLER_DIR)
  ? fs.readdirSync(CRAWLER_DIR).filter(dir =>
    fs.statSync(path.join(CRAWLER_DIR, dir)).isDirectory()
  )
  : [];

const autoProjects = domains.map(domain => {
  const metaPath = path.join(CRAWLER_DIR, domain, 'meta.json');

  let baseURL = 'http://localhost';

  if (fs.existsSync(metaPath)) {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    baseURL = meta.baseURL;
  }

  return {
    name: domain,
    testMatch: [`**/tests/auto/${domain}/**/*.spec.ts`],
    use: {
      baseURL
    }
  };
});

const e2eProject = {
  name: 'e2e',
  testMatch: ['**/tests/e2e/**/*.spec.ts'],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost',
    viewport: { width: 1600, height: 900 },
    screen: { width: 1600, height: 900 },
    launchOptions: {
      slowMo: 300,
    },
    video: process.env.VIDEO === 'true' ? 'on' : 'retain-on-failure',
    trace: 'retain-on-failure',
  }
};

const apiProject = {
  name: 'api',
  testMatch: ['**/tests/api/**/*.spec.ts'],
  use: {
    baseURL: process.env.API_BASE_URL || 'http://localhost',
  }
};

console.log('CONSENT_TOKEN:', process.env.CONSENT_TOKEN ? 'Loaded' : 'Missing');

module.exports = defineConfig({
  testDir: './tests',
  retries: 0,
  workers: 6,
  timeout: 30000,

  use: {
    headless: false,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    navigationTimeout: 15000,
    actionTimeout: 10000
  },




  projects: [
    e2eProject,
    apiProject,
    ...autoProjects
  ],

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results.json' }],
    ['allure-playwright']
  ]
});