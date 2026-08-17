import fs from 'fs';
import path from 'path';

const allureResultsDir = path.join(process.cwd(), 'allure-results');
const outputDir = path.join(process.cwd(), 'shared-report');
const assetsDir = path.join(outputDir, 'assets');

type AllureResult = {
  uuid?: string;
  name?: string;
  fullName?: string;
  status?: string;
  start?: number;
  stop?: number;
  labels?: { name: string; value: string }[];
  steps?: any[];
  attachments?: { name: string; source: string; type: string }[];
  statusDetails?: {
    message?: string;
    trace?: string;
  };
};

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatDuration(start?: number, stop?: number): string {
  if (!start || !stop) return '-';
  const seconds = Math.round((stop - start) / 1000);
  return `${seconds}s`;
}

function statusClass(status?: string): string {
  if (status === 'passed') return 'passed';
  if (status === 'failed') return 'failed';
  if (status === 'broken') return 'broken';
  if (status === 'skipped') return 'skipped';
  return 'unknown';
}

function readResults(): AllureResult[] {
  if (!fs.existsSync(allureResultsDir)) {
    throw new Error('allure-results folder not found.');
  }

  return fs
    .readdirSync(allureResultsDir)
    .filter(file => file.endsWith('-result.json'))
    .map(file => {
      const fullPath = path.join(allureResultsDir, file);
      return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    });
}

function copyAttachment(source: string): string | null {
  const sourcePath = path.join(allureResultsDir, source);

  if (!fs.existsSync(sourcePath)) return null;

  ensureDir(assetsDir);

  const targetPath = path.join(assetsDir, source);
  fs.copyFileSync(sourcePath, targetPath);

  return `assets/${source}`;
}

function renderAttachments(result: AllureResult): string {
  const attachments = result.attachments || [];

  if (!attachments.length) return '<p class="muted">No attachments.</p>';

  return attachments
    .map(att => {
      const copiedPath = copyAttachment(att.source);
      if (!copiedPath) return '';

      if (att.type?.includes('image')) {
        return `
          <div class="attachment">
            <div class="attachment-title">${escapeHtml(att.name)}</div>
            <img src="${copiedPath}" alt="${escapeHtml(att.name)}" />
          </div>
        `;
      }

      if (att.type?.includes('text') || att.type?.includes('json')) {
        const content = fs.readFileSync(path.join(allureResultsDir, att.source), 'utf8');
        return `
          <details class="attachment">
            <summary>${escapeHtml(att.name)}</summary>
            <pre>${escapeHtml(content)}</pre>
          </details>
        `;
      }

      return `
        <div class="attachment">
          <a href="${copiedPath}" target="_blank">${escapeHtml(att.name)}</a>
        </div>
      `;
    })
    .join('');
}

function renderSteps(steps: any[] = []): string {
  if (!steps.length) return '<p class="muted">No steps.</p>';

  return `
    <ol class="steps">
      ${steps
        .map(step => {
          const duration = formatDuration(step.start, step.stop);
          return `
            <li>
              <span class="badge ${statusClass(step.status)}">${escapeHtml(step.status)}</span>
              <strong>${escapeHtml(step.name)}</strong>
              <span class="muted">(${duration})</span>
            </li>
          `;
        })
        .join('')}
    </ol>
  `;
}

function renderReport(results: AllureResult[]): string {
  const total = results.length;
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const broken = results.filter(r => r.status === 'broken').length;
  const skipped = results.filter(r => r.status === 'skipped').length;

  const generatedAt = new Date().toLocaleString();

  return `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>QA Promotion Flow Report</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      background: #f5f6f8;
      color: #1f2937;
    }

    header {
      background: #111827;
      color: white;
      padding: 28px 40px;
    }

    h1 {
      margin: 0 0 8px;
      font-size: 28px;
    }

    .container {
      padding: 32px 40px;
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(5, minmax(120px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }

    .card {
      background: white;
      border-radius: 12px;
      padding: 18px;
      box-shadow: 0 1px 4px rgba(0,0,0,.08);
    }

    .metric {
      font-size: 28px;
      font-weight: bold;
      margin-top: 8px;
    }

    .test {
      background: white;
      border-radius: 12px;
      margin-bottom: 24px;
      padding: 22px;
      box-shadow: 0 1px 4px rgba(0,0,0,.08);
    }

    .test-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 14px;
      margin-bottom: 18px;
    }

    .test-title {
      font-size: 18px;
      font-weight: bold;
    }

    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
    }

    .passed { background: #dcfce7; color: #166534; }
    .failed { background: #fee2e2; color: #991b1b; }
    .broken { background: #ffedd5; color: #9a3412; }
    .skipped { background: #e5e7eb; color: #374151; }
    .unknown { background: #e0e7ff; color: #3730a3; }

    .muted {
      color: #6b7280;
      font-size: 13px;
    }

    .steps li {
      margin-bottom: 8px;
    }

    img {
      max-width: 100%;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      margin-top: 8px;
    }

    pre {
      background: #111827;
      color: #e5e7eb;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 12px;
    }

    details {
      margin-top: 12px;
    }

    summary {
      cursor: pointer;
      font-weight: bold;
    }

    .attachment {
      margin-top: 18px;
    }

    .attachment-title {
      font-weight: bold;
      margin-bottom: 6px;
    }

    .error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
      border-radius: 8px;
      padding: 12px;
      margin-top: 12px;
    }
  </style>
</head>
<body>
  <header>
    <h1>QA Promotion Flow Report</h1>
    <div>Generated at: ${escapeHtml(generatedAt)}</div>
  </header>

  <main class="container">
    <section class="summary">
      <div class="card">Total<div class="metric">${total}</div></div>
      <div class="card">Passed<div class="metric">${passed}</div></div>
      <div class="card">Failed<div class="metric">${failed}</div></div>
      <div class="card">Broken<div class="metric">${broken}</div></div>
      <div class="card">Skipped<div class="metric">${skipped}</div></div>
    </section>

    ${results
      .map(result => `
        <section class="test">
          <div class="test-header">
            <div>
              <div class="test-title">${escapeHtml(result.name)}</div>
              <div class="muted">${escapeHtml(result.fullName)}</div>
              <div class="muted">Duration: ${formatDuration(result.start, result.stop)}</div>
            </div>
            <span class="badge ${statusClass(result.status)}">${escapeHtml(result.status)}</span>
          </div>

          ${
            result.statusDetails?.message
              ? `<div class="error"><strong>Error:</strong><br>${escapeHtml(result.statusDetails.message)}</div>`
              : ''
          }

          <h3>Steps</h3>
          ${renderSteps(result.steps)}

          <h3>Attachments</h3>
          ${renderAttachments(result)}
        </section>
      `)
      .join('')}
  </main>
</body>
</html>
`;
}

function run() {
  ensureDir(outputDir);
  ensureDir(assetsDir);

  const results = readResults();
  const html = renderReport(results);

  fs.writeFileSync(path.join(outputDir, 'index.html'), html, 'utf8');

  console.log(`Shareable report generated: ${path.join(outputDir, 'index.html')}`);
}

run();