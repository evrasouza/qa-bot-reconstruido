const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

// ---------------- CONFIG ----------------

const siteConfigs = [
  {
    baseURL: "https://www.ski-doo.brp.com/",
    allowedHosts: [
      "www.ski-doo.brp.com",
      "www.ski-doo-shop.brp.com"
    ]
  },
  {
    baseURL: "https://www.can-am.brp.com/",
    allowedHosts: [
      "www.can-am.brp.com",
      "shop.can-am.brp.com"
    ]
  },
  {
    baseURL: "https://www.sea-doo.brp.com/",
    allowedHosts: [
      "www.sea-doo.brp.com",
      "shop.sea-doo.brp.com"
    ]
  },
  {
    baseURL: "https://www.brplynx.com/",
    allowedHosts: [
      "www.brplynx.com"
    ]
  }
];

const REGION = "/ca/en";
const MAX_PAGES = 5000;
const CONCURRENCY = 8;
const MAX_RETRIES = 2;
const LOG_SKIPPED = false;

const ignoredExtensions = [
  ".pdf", ".jpg", ".jpeg", ".png", ".gif",
  ".svg", ".webp", ".zip", ".doc", ".docx",
  ".xls", ".xlsx", ".mp4", ".mp3", ".avi",
  ".mov", ".ppt", ".pptx", ".xml", ".json"
];

// ---------------- UTILS ----------------

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatDomain(baseURL) {
  return new URL(baseURL)
    .hostname
    .replace(/^www\./, "")
    .replace(/\./g, "_")
    .replace(/-/g, "_");
}

function isFile(url) {
  return ignoredExtensions.some(ext => url.toLowerCase().includes(ext));
}

function normalizePath(url, baseURL) {
  try {
    const u = new URL(url, baseURL);
    let pathname = u.pathname.split("?")[0];

    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }

    return pathname;
  } catch {
    return null;
  }
}

function isValidRegion(pathname) {
  return pathname && pathname.includes(REGION);
}

function shouldSkipPath(pathname) {
  if (!pathname) return { skip: true, reason: "empty-path" };
  if (pathname.includes("{") || pathname.includes("}")) {
    return { skip: true, reason: "template-placeholder-path" };
  }
  if (pathname.endsWith("/sitemap.html")) {
    return { skip: true, reason: "sitemap-page" };
  }
  return { skip: false, reason: null };
}

function isAllowedHost(url, allowedHosts) {
  try {
    const host = new URL(url).host;
    return allowedHosts.includes(host);
  } catch {
    return false;
  }
}

function createQueueItem(rawHref, sourceUrl, sourceType, baseURL) {
  try {
    const resolvedUrl = new URL(rawHref, baseURL).href;
    const normalizedPath = normalizePath(resolvedUrl, baseURL);

    return {
      resolvedUrl,
      normalizedPath,
      sourceUrl,
      sourceType,
      rawHref
    };
  } catch {
    return null;
  }
}

function logSkipped(item, reason, ctx) {
  if (!LOG_SKIPPED) return;

  console.log(
    `[${ctx.domain}] SKIPPED | reason=${reason} | raw=${item?.rawHref || "n/a"} | resolved=${item?.resolvedUrl || "n/a"} | from=${item?.sourceUrl || "n/a"}`
  );
}

// ---------------- SITEMAP ----------------

async function loadSitemap(page, siteConfig) {
  const sitemapURL = `${siteConfig.baseURL}${REGION}/sitemap.html`;

  console.log(`\n📍 Loading sitemap: ${sitemapURL}`);

  try {
    const response = await page.goto(sitemapURL, {
      waitUntil: "domcontentloaded",
      timeout: 15000
    });

    const status = response?.status() ?? 0;

    if (status >= 400 || status === 0) {
      console.log(`⚠️ Sitemap returned status ${status}`);
      return [];
    }

    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("a"))
        .map(a => a.href || a.getAttribute("href"))
        .filter(h =>
          h &&
          !h.includes("#") &&
          !h.startsWith("mailto:") &&
          !h.startsWith("tel:") &&
          !h.startsWith("javascript:") &&
          !h.startsWith("data:")
        );
    });

    console.log(`✅ Sitemap links encontrados: ${links.length}`);

    return links
      .map(link => createQueueItem(link, sitemapURL, "sitemap", siteConfig.baseURL))
      .filter(Boolean);
  } catch (err) {
    console.log(`❌ Erro ao carregar sitemap: ${err.message}`);
    return [];
  }
}

// ---------------- PAGE NAVIGATION ----------------

async function gotoWithRetry(page, url, attempt = 1) {
  try {
    const start = Date.now();

    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 15000
    });

    return {
      success: true,
      status: response?.status() || 0,
      duration: Date.now() - start
    };
  } catch (err) {
    if (attempt >= MAX_RETRIES) {
      return {
        success: false,
        error: err.message
      };
    }

    await sleep(300 * attempt);
    return gotoWithRetry(page, url, attempt + 1);
  }
}

// ---------------- PAGE LINKS ----------------

async function extractPageLinks(page, currentUrl, siteConfig) {
  const hrefs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("a[href]"))
      .map(a => a.getAttribute("href"))
      .filter(h =>
        h &&
        !h.includes("#") &&
        !h.startsWith("mailto:") &&
        !h.startsWith("tel:") &&
        !h.startsWith("javascript:") &&
        !h.startsWith("data:")
      );
  });

  return hrefs
    .map(href => createQueueItem(href, currentUrl, "page", siteConfig.baseURL))
    .filter(Boolean);
}

// ---------------- WORKER ----------------

async function worker(queue, browserContext, ctx) {
  const page = await browserContext.newPage();

  while (true) {
    const item = queue.shift();
    if (!item) break;

    if (!item.normalizedPath) {
      logSkipped(item, "invalid-normalized-path", ctx);
      continue;
    }

    if (ctx.visitedPaths.has(item.normalizedPath)) {
      logSkipped(item, "already-visited-path", ctx);
      continue;
    }

    if (isFile(item.resolvedUrl) || isFile(item.normalizedPath)) {
      logSkipped(item, "ignored-file-extension", ctx);
      continue;
    }

    if (!isValidRegion(item.normalizedPath)) {
      logSkipped(item, "outside-region", ctx);
      continue;
    }

    const skipDecision = shouldSkipPath(item.normalizedPath);
    if (skipDecision.skip) {
      logSkipped(item, skipDecision.reason, ctx);
      continue;
    }

    if (!isAllowedHost(item.resolvedUrl, ctx.allowedHosts)) {
      logSkipped(item, "host-not-allowed", ctx);
      continue;
    }

    ctx.visitedPaths.add(item.normalizedPath);
    ctx.resolvedByPath.set(item.normalizedPath, item.resolvedUrl);
    ctx.discoveryMap.set(item.normalizedPath, {
      sourceUrl: item.sourceUrl,
      sourceType: item.sourceType,
      rawHref: item.rawHref,
      resolvedUrl: item.resolvedUrl
    });

    console.log(
      `[${ctx.domain}] → ${item.resolvedUrl} | from=${item.sourceType}${item.sourceUrl ? ` | source=${item.sourceUrl}` : ""}`
    );

    const result = await gotoWithRetry(page, item.resolvedUrl);

    ctx.metrics.total++;

    if (result.success) {
      ctx.metrics.success++;
      ctx.metrics.totalTime += result.duration;

      if (result.status >= 400) {
        ctx.metrics.errors++;
        ctx.metrics.failedUrls.push({
          url: item.resolvedUrl,
          normalizedPath: item.normalizedPath,
          sourceUrl: item.sourceUrl,
          sourceType: item.sourceType,
          rawHref: item.rawHref,
          status: result.status,
          error: `HTTP status ${result.status}`
        });
        continue;
      }
    } else {
      ctx.metrics.fail++;
      ctx.metrics.errors++;
      ctx.metrics.failedUrls.push({
        url: item.resolvedUrl,
        normalizedPath: item.normalizedPath,
        sourceUrl: item.sourceUrl,
        sourceType: item.sourceType,
        rawHref: item.rawHref,
        status: 0,
        error: result.error
      });
      continue;
    }

    try {
      const links = await extractPageLinks(page, item.resolvedUrl, ctx.siteConfig);

      for (const discoveredItem of links) {
        if (!discoveredItem?.normalizedPath) continue;
        if (ctx.visitedPaths.has(discoveredItem.normalizedPath)) continue;

        if (isFile(discoveredItem.resolvedUrl) || isFile(discoveredItem.normalizedPath)) continue;
        if (!isValidRegion(discoveredItem.normalizedPath)) continue;

        const skipDecision = shouldSkipPath(discoveredItem.normalizedPath);
        if (skipDecision.skip) continue;

        if (!isAllowedHost(discoveredItem.resolvedUrl, ctx.allowedHosts)) continue;

        if (ctx.visitedPaths.size + queue.length < MAX_PAGES) {
          queue.push(discoveredItem);
        }
      }
    } catch (err) {
      ctx.metrics.errors++;
      ctx.metrics.extractionErrors.push({
        pageUrl: item.resolvedUrl,
        normalizedPath: item.normalizedPath,
        sourceUrl: item.sourceUrl,
        sourceType: item.sourceType,
        error: err.message
      });
    }
  }

  await page.close();
}

// ---------------- CRAWLER ----------------

async function crawlSite(browser, siteConfig) {
  const domain = formatDomain(siteConfig.baseURL);
  const browserContext = await browser.newContext();

  const queue = [];
  const ctx = {
    baseURL: siteConfig.baseURL,
    allowedHosts: siteConfig.allowedHosts,
    siteConfig,
    domain,
    visitedPaths: new Set(),
    resolvedByPath: new Map(),
    discoveryMap: new Map(),
    metrics: {
      total: 0,
      success: 0,
      fail: 0,
      errors: 0,
      totalTime: 0,
      failedUrls: [],
      extractionErrors: []
    }
  };

  // 1. tenta sitemap primeiro
  const page = await browserContext.newPage();
  const sitemapItems = await loadSitemap(page, siteConfig);

  for (const item of sitemapItems) {
    if (!item) continue;
    if (!item.normalizedPath) continue;
    if (!isValidRegion(item.normalizedPath)) continue;
    if (isFile(item.resolvedUrl) || isFile(item.normalizedPath)) continue;

    const skipDecision = shouldSkipPath(item.normalizedPath);
    if (skipDecision.skip) continue;

    if (!isAllowedHost(item.resolvedUrl, siteConfig.allowedHosts)) continue;

    queue.push(item);
  }

  await page.close();

  // 2. fallback seed se sitemap falhar
  if (queue.length === 0) {
    const fallbackSeeds = [`${REGION}/`, `${REGION}`];

    for (const seed of fallbackSeeds) {
      const item = createQueueItem(seed, null, "seed", siteConfig.baseURL);
      if (!item?.normalizedPath) continue;
      if (!isValidRegion(item.normalizedPath)) continue;

      const skipDecision = shouldSkipPath(item.normalizedPath);
      if (skipDecision.skip) continue;

      queue.push(item);
    }
  }

  console.log(`🚀 Queue inicial: ${queue.length}`);

  const startTime = Date.now();

  const workers = Array.from({ length: CONCURRENCY }, () =>
    worker(queue, browserContext, ctx)
  );

  await Promise.all(workers);
  await browserContext.close();

  const pages = [...ctx.visitedPaths].sort();

  const pageDetails = pages.map(pagePath => ({
    path: pagePath,
    resolvedUrl: ctx.resolvedByPath.get(pagePath) || new URL(pagePath, siteConfig.baseURL).href,
    discoveredFrom: ctx.discoveryMap.get(pagePath)?.sourceUrl || null,
    discoveryType: ctx.discoveryMap.get(pagePath)?.sourceType || null,
    rawHref: ctx.discoveryMap.get(pagePath)?.rawHref || pagePath
  }));

  const date = new Date().toISOString().split("T")[0];
  const dir = path.join("crawler-output", domain);

  fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(
    path.join(dir, "meta.json"),
    JSON.stringify(
      {
        baseURL: siteConfig.baseURL,
        domain,
        allowedHosts: siteConfig.allowedHosts
      },
      null,
      2
    )
  );

  const snapshotPath = path.join(dir, `${date}.json`);
  fs.writeFileSync(snapshotPath, JSON.stringify(pages, null, 2));

  const detailedSnapshotPath = path.join(dir, `${date}.detailed.json`);
  fs.writeFileSync(detailedSnapshotPath, JSON.stringify(pageDetails, null, 2));

  fs.writeFileSync(
    path.join(dir, `metrics-${date}.json`),
    JSON.stringify(ctx.metrics, null, 2)
  );

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const avgMsPerPage = ctx.metrics.success > 0
    ? (ctx.metrics.totalTime / ctx.metrics.success).toFixed(0)
    : 0;

  console.log("\n===============================");
  console.log(`🌐 ${siteConfig.baseURL}`);
  console.log(`Allowed hosts: ${siteConfig.allowedHosts.join(", ")}`);
  console.log(`Pages: ${pages.length}`);
  console.log(`Time: ${duration}s`);
  console.log(`Success: ${ctx.metrics.success}`);
  console.log(`Fail: ${ctx.metrics.fail}`);
  console.log(`Errors: ${ctx.metrics.errors}`);
  console.log(`Avg page time: ${avgMsPerPage}ms`);
  console.log(`Snapshot: ${snapshotPath}`);
  console.log(`Detailed Snapshot: ${detailedSnapshotPath}`);
  console.log("===============================\n");
}

// ---------------- EXEC ----------------

(async () => {
  const browser = await chromium.launch({ headless: true });

  try {
    for (const siteConfig of siteConfigs) {
      await crawlSite(browser, siteConfig);
    }
  } finally {
    await browser.close();
  }
})();
