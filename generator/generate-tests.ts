const fs = require("fs");
const path = require("path");

// ---------------- CONFIG ----------------

const crawlerOutputDir = path.join(process.cwd(), "crawler-output");
const testsOutputDir = path.join(process.cwd(), "tests", "auto");

// Ligue/desligue aqui
const ENABLE_RUNTIME_VALIDATION = false;

// ---------------- UTILS ----------------

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function getDomains() {
  if (!fs.existsSync(crawlerOutputDir)) return [];

  return fs.readdirSync(crawlerOutputDir).filter(item => {
    const fullPath = path.join(crawlerOutputDir, item);
    return fs.statSync(fullPath).isDirectory();
  });
}

function getLatestSnapshotFiles(domainDir) {
  const files = fs.readdirSync(domainDir);

  const simpleSnapshots = files
    .filter(file => /^\d{4}-\d{2}-\d{2}\.json$/.test(file))
    .sort();

  const detailedSnapshots = files
    .filter(file => /^\d{4}-\d{2}-\d{2}\.detailed\.json$/.test(file))
    .sort();

  return {
    latestSimple: simpleSnapshots.length ? simpleSnapshots[simpleSnapshots.length - 1] : null,
    latestDetailed: detailedSnapshots.length ? detailedSnapshots[detailedSnapshots.length - 1] : null
  };
}

function sanitizeFileName(pagePath) {
  return pagePath
    .replace(/^\/+/, "")
    .replace(/[\/\\]+/g, "__")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

function escapeForTsString(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
}

function normalizePageEntries(entries, baseURL) {
  if (!Array.isArray(entries)) return [];
  if (entries.length === 0) return [];

  if (typeof entries[0] === "object" && entries[0] !== null) {
    return entries.map(entry => ({
      path: entry.path,
      resolvedUrl: entry.resolvedUrl || new URL(entry.path, baseURL).href,
      discoveredFrom: entry.discoveredFrom || null,
      discoveryType: entry.discoveryType || null,
      rawHref: entry.rawHref || entry.path
    }));
  }

  return entries.map(pagePath => ({
    path: pagePath,
    resolvedUrl: new URL(pagePath, baseURL).href,
    discoveredFrom: null,
    discoveryType: "legacy-simple-snapshot",
    rawHref: pagePath
  }));
}

function getPathParts(pagePath) {
  return pagePath.split('/').filter(Boolean);
}

function getLocaleFromPath(pagePath) {
  const parts = getPathParts(pagePath);
  if (parts.length >= 2) {
    return `${parts[0]}/${parts[1]}`;
  }
  return 'unknown-locale';
}

function getFeatureFromDomain(domain) {
  return domain;
}

function getStoryFromPath(pagePath) {
  const parts = getPathParts(pagePath);
  return parts[2] || 'root';
}

function getSubSuiteFromPath(pagePath) {
  const parts = getPathParts(pagePath);
  return parts.slice(3, -1).join('/') || 'page';
}

function generateRuntimeBlock() {
  if (!ENABLE_RUNTIME_VALIDATION) {
    return "";
  }

  return `
  const runtime = {
    consoleMessages: [],
    consoleErrors: [],
    pageErrors: [],
    requestFailures: []
  };

  page.on('console', msg => {
    const entry = {
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    };

    runtime.consoleMessages.push(entry);

    if (msg.type() === 'error') {
      runtime.consoleErrors.push(entry);
    }
  });

  page.on('pageerror', error => {
    runtime.pageErrors.push({
      message: error.message,
      stack: error.stack || null
    });
  });

  page.on('requestfailed', request => {
    runtime.requestFailures.push({
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      failure: request.failure()?.errorText || 'unknown'
    });
  });
`;
}

function generateRuntimeSummaryFields() {
  if (!ENABLE_RUNTIME_VALIDATION) {
    return `
    runtimeValidated: false
`;
  }

  return `
    runtimeValidated: false,
    criticalConsoleErrorsFound: 0,
    criticalPageErrorsFound: 0,
    criticalRequestFailuresFound: 0,
    ignoredConsoleErrorsFound: 0,
    ignoredRequestFailuresFound: 0
`;
}

function generateRuntimeStep() {
  if (!ENABLE_RUNTIME_VALIDATION) {
    return "";
  }

  return `
  await test.step('Runtime errors validation', async () => {
    await testInfo.attach('runtime-errors.json', {
      body: JSON.stringify(runtime, null, 2),
      contentType: 'application/json'
    });

    const ignoredPatterns = [
      /favicon/i,
      /google-analytics/i,
      /googletagmanager/i,
      /doubleclick/i,
      /facebook/i,
      /bing/i,
      /hotjar/i,
      /clarity/i,
      /addthis/i,
      /s7\\\\.addthis\\\\.com/i,
      /bat\\\\.bing\\\\.com/i,
      /connect\\\\.facebook\\\\.net/i,
      /googleads/i,
      /analytics/i,
      /tagmanager/i
    ];

    const isIgnored = (text) => {
      return ignoredPatterns.some(pattern => pattern.test(text || ''));
    };

    const ignoredConsoleErrors = runtime.consoleErrors.filter(item => {
      const combined = [
        item.text || '',
        item.location?.url || ''
      ].join(' | ');

      return isIgnored(combined);
    });

    const criticalConsoleErrors = runtime.consoleErrors.filter(item => {
      const combined = [
        item.text || '',
        item.location?.url || ''
      ].join(' | ');

      return !isIgnored(combined);
    });

    const ignoredRequestFailures = runtime.requestFailures.filter(item => {
      const combined = [
        item.url || '',
        item.failure || '',
        item.resourceType || ''
      ].join(' | ');

      return isIgnored(combined);
    });

    const criticalRequestFailures = runtime.requestFailures.filter(item => {
      const combined = [
        item.url || '',
        item.failure || '',
        item.resourceType || ''
      ].join(' | ');

      return !isIgnored(combined);
    });

    validationSummary.criticalConsoleErrorsFound = criticalConsoleErrors.length;
    validationSummary.criticalPageErrorsFound = runtime.pageErrors.length;
    validationSummary.criticalRequestFailuresFound = criticalRequestFailures.length;
    validationSummary.ignoredConsoleErrorsFound = ignoredConsoleErrors.length;
    validationSummary.ignoredRequestFailuresFound = ignoredRequestFailures.length;

    await testInfo.attach('runtime-classification.json', {
      body: JSON.stringify({
        ignoredConsoleErrors,
        criticalConsoleErrors,
        ignoredRequestFailures,
        criticalRequestFailures,
        pageErrors: runtime.pageErrors
      }, null, 2),
      contentType: 'application/json'
    });

    expect(
      criticalConsoleErrors,
      'Critical console errors found'
    ).toEqual([]);

    expect(
      runtime.pageErrors,
      'Page errors found'
    ).toEqual([]);

    expect(
      criticalRequestFailures,
      'Critical request failures found'
    ).toEqual([]);

    validationSummary.runtimeValidated = true;
  });
`;
}

function generateDebugPayload() {
  if (!ENABLE_RUNTIME_VALIDATION) {
    return `
      metadata: pageMetadata,
      validationSummary,
      finalUrl: page.url()
`;
  }

  return `
      metadata: pageMetadata,
      validationSummary,
      runtime,
      finalUrl: page.url()
`;
}

function generateTestContent({
  domain,
  pagePath,
  resolvedUrl,
  discoveredFrom,
  discoveryType,
  rawHref,
  useAbsoluteResolvedUrl
}) {
  const safePath = escapeForTsString(pagePath);
  const safeResolvedUrl = escapeForTsString(resolvedUrl);
  const safeDiscoveredFrom = escapeForTsString(discoveredFrom || "");
  const safeDiscoveryType = escapeForTsString(discoveryType || "");
  const safeRawHref = escapeForTsString(rawHref || "");
  const featureLabel = escapeForTsString(getFeatureFromDomain(domain));
  const suiteLabel = escapeForTsString(getLocaleFromPath(pagePath));
  const storyLabel = escapeForTsString(getStoryFromPath(pagePath));
  const subSuiteLabel = escapeForTsString(getSubSuiteFromPath(pagePath));

  const gotoTarget = useAbsoluteResolvedUrl
    ? `\`${safeResolvedUrl}\``
    : `\`${safePath}\``;

  return `import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

test('[${domain}] ${safePath}', async ({ page }, testInfo) => {
  const pageMetadata = {
    domain: '${domain}',
    path: \`${safePath}\`,
    resolvedUrl: \`${safeResolvedUrl}\`,
    discoveredFrom: ${discoveredFrom ? `\`${safeDiscoveredFrom}\`` : 'null'},
    discoveryType: ${discoveryType ? `\`${safeDiscoveryType}\`` : 'null'},
    rawHref: ${rawHref ? `\`${safeRawHref}\`` : 'null'},
    usedNavigationTarget: ${useAbsoluteResolvedUrl ? `\`${safeResolvedUrl}\`` : `\`${safePath}\``},
    usedAbsoluteResolvedUrl: ${useAbsoluteResolvedUrl}
  };

  const validationSummary = {
    navigation: false,
    bodyVisible: false,
    titlePresent: false,
    h1Present: false,
    h1TextPresent: false,
    metaDescriptionPresent: false,
    canonicalPresent: false,
    robotsWithoutNoindex: false,
    placeholderCheckPassed: false,
    internalLinksChecked: 0,
    brokenInternalLinksFound: 0,
    accessedUrl: null,
    initialStatus: null,
    placeholderDoubleCurlyMatchesFound: 0,
    placeholderDollarCurlyMatchesFound: 0,
    suspiciousPlaceholderMatchesFound: 0,${generateRuntimeSummaryFields()}
  };
${generateRuntimeBlock()}
  await allure.label('brand', '${domain}');
  await allure.label('type', 'health');
  await allure.label('type', 'seo');
  await allure.label('type', 'links');

  await allure.feature('${featureLabel}');
  await allure.story('${storyLabel}');
  await allure.suite('${suiteLabel}');
  await allure.subSuite('${subSuiteLabel}');

  await test.step('Attach crawler metadata', async () => {
    await testInfo.attach('crawler-metadata.json', {
      body: JSON.stringify(pageMetadata, null, 2),
      contentType: 'application/json'
    });

    await testInfo.attach('accessed-url.txt', {
      body: [
        'domain=' + pageMetadata.domain,
        'path=' + pageMetadata.path,
        'resolvedUrl=' + pageMetadata.resolvedUrl,
        'usedNavigationTarget=' + pageMetadata.usedNavigationTarget,
        'discoveredFrom=' + pageMetadata.discoveredFrom,
        'discoveryType=' + pageMetadata.discoveryType,
        'rawHref=' + pageMetadata.rawHref
      ].join('\\n'),
      contentType: 'text/plain'
    });
  });

  await test.step('Navigate to page', async () => {
    console.log('[NAVIGATION]', JSON.stringify({
      domain: pageMetadata.domain,
      path: pageMetadata.path,
      resolvedUrl: pageMetadata.resolvedUrl,
      usedNavigationTarget: pageMetadata.usedNavigationTarget,
      discoveredFrom: pageMetadata.discoveredFrom,
      discoveryType: pageMetadata.discoveryType
    }));

    const response = await page.goto(${gotoTarget}, {
      waitUntil: 'domcontentloaded'
    });

    const status = response?.status() ?? 0;
    const finalUrl = page.url();

    validationSummary.initialStatus = status;
    validationSummary.accessedUrl = finalUrl;

    expect(
      status,
      [
        'Navigation failed',
        'path=' + pageMetadata.path,
        'resolvedUrl=' + pageMetadata.resolvedUrl,
        'discoveredFrom=' + pageMetadata.discoveredFrom,
        'discoveryType=' + pageMetadata.discoveryType,
        'rawHref=' + pageMetadata.rawHref,
        'usedTarget=' + pageMetadata.usedNavigationTarget,
        'finalUrl=' + finalUrl
      ].join(' | ')
    ).toBeGreaterThan(0);

    expect(
      status,
      [
        'Unexpected HTTP status',
        'status=' + status,
        'path=' + pageMetadata.path,
        'resolvedUrl=' + pageMetadata.resolvedUrl,
        'discoveredFrom=' + pageMetadata.discoveredFrom,
        'discoveryType=' + pageMetadata.discoveryType,
        'rawHref=' + pageMetadata.rawHref,
        'usedTarget=' + pageMetadata.usedNavigationTarget,
        'finalUrl=' + finalUrl
      ].join(' | ')
    ).toBeLessThan(400);

    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });

    const main = page.locator('main');
    const h1 = page.locator('h1').first();

    if (await main.count()) {
      await expect(main.first()).toBeVisible({ timeout: 10000 });
    } else if (await h1.count()) {
      await expect(h1).toBeVisible({ timeout: 10000 });
    }

    validationSummary.navigation = true;

    await testInfo.attach('navigation-debug.json', {
      body: JSON.stringify({
        initialStatus: status,
        usedNavigationTarget: pageMetadata.usedNavigationTarget,
        resolvedUrl: pageMetadata.resolvedUrl,
        finalUrl,
        title: await page.title()
      }, null, 2),
      contentType: 'application/json'
    });

    await testInfo.attach('final-accessed-url.txt', {
      body: [
        'usedNavigationTarget=' + pageMetadata.usedNavigationTarget,
        'resolvedUrl=' + pageMetadata.resolvedUrl,
        'finalUrl=' + finalUrl,
        'initialStatus=' + status
      ].join('\\n'),
      contentType: 'text/plain'
    });
  });

  await test.step('Basic structure validation', async () => {
    await expect(page.locator('body')).toBeVisible();
    validationSummary.bodyVisible = true;

    await expect(page).toHaveTitle(/.+/);
    validationSummary.titlePresent = true;

    const h1Count = await page.locator('h1').count();
    expect(h1Count, 'No H1 found').toBeGreaterThan(0);
    validationSummary.h1Present = true;

    const firstH1Text = (await page.locator('h1').first().textContent())?.trim() || '';
    expect(firstH1Text, 'First H1 is empty').not.toBe('');
    validationSummary.h1TextPresent = true;
  });

  await test.step('SEO validation', async () => {
    const metaDescription = await page.locator('meta[name="description"]').getAttribute('content');
    expect(metaDescription?.trim(), 'Meta description missing or empty').toBeTruthy();
    validationSummary.metaDescriptionPresent = true;

    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical?.trim(), 'Canonical missing or empty').toBeTruthy();
    validationSummary.canonicalPresent = true;

    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    expect((robots || '').toLowerCase(), 'Robots contains noindex').not.toContain('noindex');
    validationSummary.robotsWithoutNoindex = true;
  });

  await test.step('Check placeholder content', async () => {
    const sanitizedBodyHtml = await page.locator('body').evaluate((body) => {
      const clone = body.cloneNode(true);

      clone.querySelectorAll('script, style, noscript').forEach(node => node.remove());

      return clone.innerHTML;
    });

    const lower = sanitizedBodyHtml.toLowerCase();

    expect(lower).not.toContain('lorem ipsum');
    expect(lower).not.toContain('translation missing');

    const doubleCurlyRegex = /{{.*?}}/g;
    const dollarCurlyRegex = /\\$\\{.*?\\}/g;

    const doubleCurlyMatches = [...sanitizedBodyHtml.matchAll(doubleCurlyRegex)].map(match => ({
      match: match[0],
      index: match.index ?? -1,
      context: sanitizedBodyHtml.slice(
        Math.max(0, (match.index ?? 0) - 80),
        Math.min(sanitizedBodyHtml.length, (match.index ?? 0) + match[0].length + 80)
      )
    }));

    const dollarCurlyMatches = [...sanitizedBodyHtml.matchAll(dollarCurlyRegex)].map(match => ({
      match: match[0],
      index: match.index ?? -1,
      context: sanitizedBodyHtml.slice(
        Math.max(0, (match.index ?? 0) - 80),
        Math.min(sanitizedBodyHtml.length, (match.index ?? 0) + match[0].length + 80)
      )
    }));

    validationSummary.placeholderDoubleCurlyMatchesFound = doubleCurlyMatches.length;
    validationSummary.placeholderDollarCurlyMatchesFound = dollarCurlyMatches.length;

    const ignoredPlaceholderPatterns = [
      /dataLayer/i,
      /analytics/i,
      /tracking/i,
      /gtm/i,
      /googletagmanager/i
    ];

    const suspiciousDollarCurlyMatches = dollarCurlyMatches.filter(item => {
      const combined = [
        item.match,
        item.context
      ].join(' | ');

      return !ignoredPlaceholderPatterns.some(pattern => pattern.test(combined));
    });

    validationSummary.suspiciousPlaceholderMatchesFound =
      doubleCurlyMatches.length + suspiciousDollarCurlyMatches.length;

    await testInfo.attach('placeholder-debug.json', {
      body: JSON.stringify({
        doubleCurlyMatches,
        dollarCurlyMatches,
        suspiciousDollarCurlyMatches
      }, null, 2),
      contentType: 'application/json'
    });

    expect(
      doubleCurlyMatches,
      'Template placeholder pattern found: double-curly-braces'
    ).toEqual([]);

    expect(
      suspiciousDollarCurlyMatches,
      'Template placeholder pattern found: dollar-curly-braces'
    ).toEqual([]);

    validationSummary.placeholderCheckPassed = true;
  });

  await test.step('Check broken internal links', async () => {
    const currentUrl = page.url();

    const hrefs = await page.$$eval('a[href]', anchors =>
      anchors
        .map(anchor => anchor.getAttribute('href'))
        .filter((href): href is string => Boolean(href))
    );

    const absoluteLinks = Array.from(
      new Set(
        hrefs
          .filter(href =>
            href &&
            !href.startsWith('#') &&
            !href.startsWith('mailto:') &&
            !href.startsWith('tel:') &&
            !href.startsWith('javascript:') &&
            !href.startsWith('data:')
          )
          .map(href => {
            try {
              return new URL(href, document.baseURI).toString();
            } catch {
              return null;
            }
          })
          .filter((href): href is string => Boolean(href))
      )
    );

    const internalLinks = absoluteLinks.filter(link => {
      try {
        return new URL(link).host === new URL(currentUrl).host;
      } catch {
        return false;
      }
    });

    const sampledLinks = internalLinks.slice(0, 25);
    const broken = [];

    for (const link of sampledLinks) {
      try {
        const res = await page.request.get(link, { failOnStatusCode: false });
        const status = res.status();

        if (status >= 400) {
          broken.push({ link, status });
        }
      } catch (error) {
        broken.push({
          link,
          status: 0,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    validationSummary.internalLinksChecked = sampledLinks.length;
    validationSummary.brokenInternalLinksFound = broken.length;

    await testInfo.attach('checked-links.json', {
      body: JSON.stringify({
        currentUrl,
        totalHrefsFound: hrefs.length,
        internalLinksFound: internalLinks.length,
        sampledLinksCount: sampledLinks.length,
        broken
      }, null, 2),
      contentType: 'application/json'
    });

    expect(
      broken,
      [
        'Broken links found',
        'path=' + pageMetadata.path,
        'resolvedUrl=' + pageMetadata.resolvedUrl
      ].join(' | ')
    ).toEqual([]);
  });
${generateRuntimeStep()}
  await testInfo.attach('validation-summary.json', {
    body: JSON.stringify(validationSummary, null, 2),
    contentType: 'application/json'
  });

  await testInfo.attach('debug.json', {
    body: JSON.stringify({${generateDebugPayload()}
    }, null, 2),
    contentType: 'application/json'
  });

  await testInfo.attach('HTML Snapshot', {
    body: await page.content(),
    contentType: 'text/html'
  });
});
`;
}

// ---------------- MAIN ----------------

function run() {
  const domains = getDomains();

  if (domains.length === 0) {
    console.log("No domains found in crawler-output.");
    return;
  }

  ensureDir(testsOutputDir);

  for (const domain of domains) {
    const domainDir = path.join(crawlerOutputDir, domain);
    const metaPath = path.join(domainDir, "meta.json");

    if (!fs.existsSync(metaPath)) {
      console.log(`Skipping ${domain}: meta.json not found.`);
      continue;
    }

    const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
    const baseURL = meta.baseURL;

    const { latestSimple, latestDetailed } = getLatestSnapshotFiles(domainDir);

    if (!latestSimple && !latestDetailed) {
      console.log(`Skipping ${domain}: no snapshot found.`);
      continue;
    }

    let sourceData;

    if (latestDetailed) {
      const sourceFile = path.join(domainDir, latestDetailed);
      sourceData = JSON.parse(fs.readFileSync(sourceFile, "utf8"));
      console.log(`Using detailed snapshot for ${domain}: ${latestDetailed}`);
    } else {
      const sourceFile = path.join(domainDir, latestSimple);
      sourceData = JSON.parse(fs.readFileSync(sourceFile, "utf8"));
      console.log(`Using simple snapshot for ${domain}: ${latestSimple}`);
    }

    const pages = normalizePageEntries(sourceData, baseURL);

    const outputDir = path.join(testsOutputDir, domain);
    ensureDir(outputDir);

    const existingFiles = fs.existsSync(outputDir)
      ? fs.readdirSync(outputDir).filter(file => file.endsWith(".spec.ts"))
      : [];

    for (const file of existingFiles) {
      fs.unlinkSync(path.join(outputDir, file));
    }

    for (const page of pages) {
      const fileName = `${sanitizeFileName(page.path)}.spec.ts`;
      const filePath = path.join(outputDir, fileName);

      let useAbsoluteResolvedUrl = false;

      try {
        const resolvedHost = new URL(page.resolvedUrl).host;
        const baseHost = new URL(baseURL).host;

        if (resolvedHost !== baseHost) {
          useAbsoluteResolvedUrl = true;
        }
      } catch {
        useAbsoluteResolvedUrl = false;
      }

      const content = generateTestContent({
        domain,
        pagePath: page.path,
        resolvedUrl: page.resolvedUrl,
        discoveredFrom: page.discoveredFrom,
        discoveryType: page.discoveryType,
        rawHref: page.rawHref,
        useAbsoluteResolvedUrl
      });

      fs.writeFileSync(filePath, content, "utf8");
    }

    console.log(`Generated ${pages.length} tests for ${domain}`);
  }

  console.log("Done generating tests.");
}

run();
