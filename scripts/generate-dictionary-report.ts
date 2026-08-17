import fs from 'fs';
import path from 'path';

type DictionaryResult = {
  executionDate: string;
  locale?: string;
  url: string;
  key: string;
  expected: string;
  actual: string | null;
  passed: boolean;
  error?: string;
};

const inputDir = path.join(process.cwd(), 'test-results', 'dictionary');

const outputFile = path.join(
  process.cwd(),
  'test-results',
  'dictionary',
  'dictionary-report.html'
);

if (!fs.existsSync(inputDir)) {
  throw new Error(`Results folder not found: ${inputDir}`);
}

const resultFiles = fs
  .readdirSync(inputDir)
  .filter(
    (file) =>
      file.startsWith('dictionary-results-') &&
      file.endsWith('.json')
  );

if (resultFiles.length === 0) {
  throw new Error(`No dictionary result files found in: ${inputDir}`);
}

const results: DictionaryResult[] = resultFiles.flatMap((file) => {
  const filePath = path.join(inputDir, file);
  const fileResults = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as DictionaryResult[];

  return fileResults.map((result) => ({
    ...result,
    locale: result.locale ?? file
      .replace('dictionary-results-', '')
      .replace('.json', ''),
  }));
});

const total = results.length;
const passed = results.filter((r) => r.passed).length;
const failed = total - passed;

const urls = [...new Set(results.map((r) => r.url))];
const keys = [...new Set(results.map((r) => r.key))];
const locales = [...new Set(results.map((r) => r.locale ?? 'unknown'))];

const executionDate = results[0]?.executionDate
  ? new Date(results[0].executionDate).toLocaleString('en-CA', {
      dateStyle: 'medium',
      timeStyle: 'medium',
    })
  : 'N/A';

function escapeHtml(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return '<span class="missing">NULL / Missing</span>';
  }

  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
    .replaceAll('\n', '<br>');
}

const rows = results
  .map(
    (r) => `
      <tr class="${r.passed ? 'passed-row' : 'failed-row'}">
        <td>${r.passed ? '✅ Passed' : '❌ Failed'}</td>
        <td><strong>${escapeHtml(r.locale)}</strong></td>
        <td><code>${escapeHtml(r.url)}</code></td>
        <td><code>${escapeHtml(r.key)}</code></td>
        <td>${escapeHtml(r.expected)}</td>
        <td>${escapeHtml(r.actual)}</td>
        <td>${r.error ?? '-'}</td>
      </tr>
    `
  )
  .join('');

const urlRows = urls
  .map((url) => {
    const urlResults = results.filter((r) => r.url === url);
    const urlPassed = urlResults.every((r) => r.passed);
    const urlLocales = [...new Set(urlResults.map((r) => r.locale ?? 'unknown'))].join(', ');

    return `
      <tr>
        <td>${urlPassed ? '✅ Passed' : '❌ Failed'}</td>
        <td>${escapeHtml(urlLocales)}</td>
        <td><code>${escapeHtml(url)}</code></td>
        <td>${urlResults.length}</td>
      </tr>
    `;
  })
  .join('');

const localeRows = locales
  .map((locale) => {
    const localeResults = results.filter((r) => r.locale === locale);
    const localePassed = localeResults.filter((r) => r.passed).length;
    const localeFailed = localeResults.length - localePassed;

    return `
      <tr>
        <td><strong>${escapeHtml(locale)}</strong></td>
        <td>${localeResults.length}</td>
        <td class="green">${localePassed}</td>
        <td class="${localeFailed > 0 ? 'red' : 'green'}">${localeFailed}</td>
      </tr>
    `;
  })
  .join('');

const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Dictionary Validation Report</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background: #f4f6f8;
      color: #1f2937;
      margin: 0;
      padding: 32px;
    }

    .container {
      max-width: 1500px;
      margin: auto;
    }

    .header {
      background: #111827;
      color: white;
      padding: 28px;
      border-radius: 12px;
      margin-bottom: 24px;
    }

    .header h1 {
      margin: 0 0 8px;
      font-size: 28px;
    }

    .header p {
      margin: 4px 0;
      color: #d1d5db;
    }

    .cards {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
    }

    .card .label {
      color: #6b7280;
      font-size: 13px;
      margin-bottom: 8px;
    }

    .card .value {
      font-size: 28px;
      font-weight: bold;
    }

    .green { color: #15803d; font-weight: bold; }
    .red { color: #b91c1c; font-weight: bold; }
    .blue { color: #1d4ed8; }

    section {
      background: white;
      padding: 24px;
      border-radius: 12px;
      margin-bottom: 24px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
    }

    h2 {
      margin-top: 0;
      font-size: 20px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }

    th {
      background: #e5e7eb;
      text-align: left;
      padding: 12px;
    }

    td {
      border-bottom: 1px solid #e5e7eb;
      padding: 12px;
      vertical-align: top;
    }

    code {
      font-family: Consolas, monospace;
      font-size: 13px;
      word-break: break-word;
    }

    .passed-row {
      background: #f0fdf4;
    }

    .failed-row {
      background: #fef2f2;
    }

    .missing {
      color: #b91c1c;
      font-weight: bold;
    }

    .footer {
      text-align: center;
      color: #6b7280;
      font-size: 12px;
      margin-top: 32px;
    }

    @media print {
      body {
        background: white;
        padding: 0;
      }

      .card, section, .header {
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">

    <div class="header">
      <h1>Dictionary Validation Report</h1>
      <p><strong>Environment:</strong> DEV2</p>
      <p><strong>Locales:</strong> ${escapeHtml(locales.join(', '))}</p>
      <p><strong>Execution Date:</strong> ${executionDate}</p>
      <p><strong>Input Files:</strong> ${escapeHtml(resultFiles.join(', '))}</p>
    </div>

    <div class="cards">
      <div class="card">
        <div class="label">Locales</div>
        <div class="value blue">${locales.length}</div>
      </div>

      <div class="card">
        <div class="label">URLs Tested</div>
        <div class="value blue">${urls.length}</div>
      </div>

      <div class="card">
        <div class="label">Dictionary Keys</div>
        <div class="value blue">${keys.length}</div>
      </div>

      <div class="card">
        <div class="label">Total Validations</div>
        <div class="value blue">${total}</div>
      </div>

      <div class="card">
        <div class="label">Passed</div>
        <div class="value green">${passed}</div>
      </div>

      <div class="card">
        <div class="label">Failed</div>
        <div class="value red">${failed}</div>
      </div>
    </div>

    <section>
      <h2>Locale Summary</h2>
      <table>
        <thead>
          <tr>
            <th>Locale</th>
            <th>Total Validations</th>
            <th>Passed</th>
            <th>Failed</th>
          </tr>
        </thead>
        <tbody>
          ${localeRows}
        </tbody>
      </table>
    </section>

    <section>
      <h2>Tested URLs</h2>
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Locale</th>
            <th>URL</th>
            <th>Validations</th>
          </tr>
        </thead>
        <tbody>
          ${urlRows}
        </tbody>
      </table>
    </section>

    <section>
      <h2>Validation Details</h2>
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Locale</th>
            <th>URL</th>
            <th>Dictionary Key</th>
            <th>Expected Value</th>
            <th>Actual Value</th>
            <th>Error</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </section>

    <div class="footer">
      Generated automatically by Playwright Dictionary Validation.
    </div>

  </div>
</body>
</html>
`;

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, html, 'utf-8');

console.log(`Dictionary HTML report generated: ${outputFile}`);