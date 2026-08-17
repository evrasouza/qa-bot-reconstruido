const fs = require('fs');
const path = require('path');

const resultsDir = path.join(process.cwd(), 'allure-results');

fs.mkdirSync(resultsDir, { recursive: true });

// ---------------- environment.properties ----------------

const environmentLines = [
  `Environment=${process.env.TEST_ENV || 'local'}`,
  `Node=${process.version}`,
  `Platform=${process.platform}`,
  `Browser=Chromium`,
  `Suite=Health Check`,
  `BaseURL=${process.env.BASE_URL || 'dynamic-per-project'}`
].join('\n');

fs.writeFileSync(
  path.join(resultsDir, 'environment.properties'),
  environmentLines,
  'utf8'
);

// ---------------- executor.json ----------------

const executor = {
  name: process.env.CI ? 'CI Pipeline' : 'Local Run',
  type: process.env.CI ? 'ci' : 'local',
  buildName: process.env.BUILD_NAME || 'local-health-check',
  buildOrder: Number(process.env.BUILD_NUMBER || Date.now()),
  buildUrl: process.env.BUILD_URL || '',
  reportName: process.env.REPORT_NAME || 'QA Bot Health Check Report',
  reportUrl: process.env.REPORT_URL || ''
};

fs.writeFileSync(
  path.join(resultsDir, 'executor.json'),
  JSON.stringify(executor, null, 2),
  'utf8'
);

// ---------------- categories.json ----------------

const categories = [
  {
    name: 'Broken links',
    matchedStatuses: ['failed'],
    messageRegex: '.*Broken links found.*'
  },
  {
    name: 'Navigation / HTTP issues',
    matchedStatuses: ['failed'],
    messageRegex: '.*Navigation failed.*|.*Unexpected HTTP status.*'
  },
  {
    name: 'SEO issues',
    matchedStatuses: ['failed'],
    messageRegex: '.*Meta description missing or empty.*|.*Canonical missing or empty.*|.*Robots contains noindex.*'
  },
  {
    name: 'Template placeholders',
    matchedStatuses: ['failed'],
    messageRegex: '.*Template placeholder.*'
  },
  {
    name: 'Structure issues',
    matchedStatuses: ['failed'],
    messageRegex: '.*No H1 found.*|.*First H1 is empty.*|.*Page title is missing or empty.*'
  },
  {
    name: 'Runtime issues',
    matchedStatuses: ['failed'],
    messageRegex: '.*Critical console errors found.*|.*Page errors found.*|.*Critical request failures found.*'
  }
];

fs.writeFileSync(
  path.join(resultsDir, 'categories.json'),
  JSON.stringify(categories, null, 2),
  'utf8'
);

console.log('Allure metadata files created successfully.');