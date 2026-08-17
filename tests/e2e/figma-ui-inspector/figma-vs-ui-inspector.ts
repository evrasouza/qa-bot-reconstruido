/// <reference lib="dom" />

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

import { DEFAULT_SELECTOR, OUTPUT_DIR, VIEWPORTS } from './config';
import { compareFigmaAndUi } from './comparator';
import { extractFigmaTextNodes, fetchFigmaNode } from './figma-client';
import { generateHtmlReport } from './report-html';
import { extractUiElementsFromBrowser } from './ui-extractor';
import { getArg, resolveDevice, sanitizeFileName } from './utils';

import type { DeviceType } from './types';

dotenv.config();

type InspectorCaseConfig = {
  name: string;
  figmaUrl: string;
  url: string;
  selector?: string;
  device?: DeviceType;
};

type InspectorConfigFile = {
  cases: InspectorCaseConfig[];
};

function loadInspectorConfig(): InspectorConfigFile {
  const configPath = path.join(
    process.cwd(),
    'tests/e2e/figma-ui-inspector/inspector.config.json'
  );

  if (!fs.existsSync(configPath)) {
    throw new Error(`Inspector config file not found: ${configPath}`);
  }

  const rawConfig = fs.readFileSync(configPath, 'utf-8');
  const config = JSON.parse(rawConfig) as InspectorConfigFile;

  if (!Array.isArray(config.cases) || config.cases.length === 0) {
    throw new Error('inspector.config.json must contain a non-empty "cases" array.');
  }

  return config;
}

function applyCliOverrides(testCase: InspectorCaseConfig): InspectorCaseConfig {
  return {
    name: getArg('name') || testCase.name,
    figmaUrl: getArg('figma-url') || testCase.figmaUrl,
    url: getArg('url') || testCase.url,
    selector: getArg('selector') || testCase.selector || DEFAULT_SELECTOR,
    device: resolveDevice(getArg('device') || testCase.device),
  };
}

function getCasesToRun(config: InspectorConfigFile): InspectorCaseConfig[] {
  const caseName = getArg('case');

  if (!caseName) {
    return config.cases.map(applyCliOverrides);
  }

  const selectedCase = config.cases.find((item) => item.name === caseName);

  if (!selectedCase) {
    const availableCases = config.cases.map((item) => item.name).join(', ');

    throw new Error(
      `Case "${caseName}" was not found. Available cases: ${availableCases}`
    );
  }

  return [applyCliOverrides(selectedCase)];
}

async function runInspection(testCase: InspectorCaseConfig): Promise<void> {
  const selector = testCase.selector || DEFAULT_SELECTOR;
  const device = resolveDevice(testCase.device);
  const viewport = VIEWPORTS[device];
  const name = testCase.name;

  const outputDir = path.join(process.cwd(), OUTPUT_DIR);

  fs.mkdirSync(outputDir, {
    recursive: true,
  });

  const fileBaseName = `${sanitizeFileName(name)}-${device}-${Date.now()}`;

  const screenshotPath = path.join(outputDir, `${fileBaseName}.png`);
  const jsonPath = path.join(outputDir, `${fileBaseName}.json`);
  const htmlPath = path.join(outputDir, `${fileBaseName}.html`);

  console.log('');
  console.log('========================================');
  console.log('FIGMA VS UI INSPECTOR');
  console.log('========================================');
  console.log(`Case: ${name}`);
  console.log(`Figma URL: ${testCase.figmaUrl}`);
  console.log(`Page URL: ${testCase.url}`);
  console.log(`Selector: ${selector}`);
  console.log(`Device: ${device}`);
  console.log(`Viewport: ${viewport.width}x${viewport.height}`);
  console.log('');

  const figmaNode = await fetchFigmaNode(testCase.figmaUrl);

  console.log('Extracting Figma text nodes...');

  const figmaElements = extractFigmaTextNodes(figmaNode);

  console.log(`Figma text nodes found: ${figmaElements.length}`);

  const uiElements = await extractUiElementsFromBrowser({
    url: testCase.url,
    selector,
    viewport,
    screenshotPath,
  });

  console.log(`UI text elements found: ${uiElements.length}`);
  console.log('Comparing Figma vs UI...');

  const comparisonResults = compareFigmaAndUi(figmaElements, uiElements);

  const fullReport = {
    generatedAt: new Date().toISOString(),
    case: name,
    figmaUrl: testCase.figmaUrl,
    url: testCase.url,
    selector,
    device,
    viewport,
    summary: {
      total: comparisonResults.length,
      pass: comparisonResults.filter((item) => item.status === 'PASS').length,
      warning: comparisonResults.filter((item) => item.status === 'WARNING').length,
      missingInUi: comparisonResults.filter(
        (item) => item.status === 'MISSING_IN_UI'
      ).length,
      extraInUi: comparisonResults.filter(
        (item) => item.status === 'EXTRA_IN_UI'
      ).length,
    },
    figmaElements,
    uiElements,
    comparisonResults,
  };

  fs.writeFileSync(jsonPath, JSON.stringify(fullReport, null, 2));

  const html = generateHtmlReport({
    name,
    url: testCase.url,
    figmaUrl: testCase.figmaUrl,
    selector,
    device,
    viewport,
    screenshotFileName: path.basename(screenshotPath),
    results: comparisonResults,
  });

  fs.writeFileSync(htmlPath, html);

  console.log('');
  console.log('========================================');
  console.log('REPORT GENERATED SUCCESSFULLY');
  console.log('========================================');
  console.log(`Case: ${name}`);
  console.log(`JSON: ${jsonPath}`);
  console.log(`HTML: ${htmlPath}`);
  console.log(`SCREENSHOT: ${screenshotPath}`);
  console.log('');
}

async function main() {
  const config = loadInspectorConfig();
  const casesToRun = getCasesToRun(config);

  console.log('');
  console.log(`Cases to run: ${casesToRun.length}`);

  for (const testCase of casesToRun) {
    await runInspection(testCase);
  }

  console.log('');
  console.log('========================================');
  console.log('ALL INSPECTIONS FINISHED');
  console.log('========================================');
  console.log('');
}

main().catch((error) => {
  console.error('');
  console.error('========================================');
  console.error('ERROR');
  console.error('========================================');
  console.error(error);
  console.error('');

  process.exit(1);
});