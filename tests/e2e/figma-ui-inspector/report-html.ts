import { ComparisonResult, ComparisonStatus, DeviceType, Viewport } from './types';

function statusIcon(status: ComparisonStatus): string {
  switch (status) {
    case 'PASS':
      return '✅';
    case 'WARNING':
      return '⚠️';
    case 'MISSING_IN_UI':
      return '❌';
    case 'EXTRA_IN_UI':
      return 'ℹ️';
    default:
      return '';
  }
}

function escapeHtml(value?: string | number | null): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function generateHtmlReport(params: {
  name: string;
  url: string;
  figmaUrl: string;
  selector: string;
  device: DeviceType;
  viewport: Viewport;
  screenshotFileName: string;
  results: ComparisonResult[];
}): string {
  const rows = params.results
    .map((item) => {
      const differences = item.differences.length
        ? `<ul>${item.differences
            .map((diff) => `<li>${escapeHtml(diff)}</li>`)
            .join('')}</ul>`
        : '';

      return `
<tr class="${item.status.toLowerCase()}">
  <td>${statusIcon(item.status)} ${item.status}</td>
  <td>${escapeHtml(item.text)}</td>
  <td>${escapeHtml(item.figma?.styles.fontFamily)}</td>
  <td>${escapeHtml(item.ui?.styles.fontFamily)}</td>
  <td>${escapeHtml(item.figma?.styles.fontSize)}</td>
  <td>${escapeHtml(item.ui?.styles.fontSize)}</td>
  <td>${escapeHtml(item.figma?.styles.lineHeight)}</td>
  <td>${escapeHtml(item.ui?.styles.lineHeight)}</td>
  <td>${escapeHtml(item.figma?.styles.fontWeight)}</td>
  <td>${escapeHtml(item.ui?.styles.fontWeight)}</td>
  <td>${escapeHtml(item.figma?.styles.color)}</td>
  <td>${escapeHtml(item.ui?.styles.color)}</td>
  <td>${differences}</td>
</tr>`;
    })
    .join('');

  const summary = {
    total: params.results.length,
    pass: params.results.filter((item) => item.status === 'PASS').length,
    warning: params.results.filter((item) => item.status === 'WARNING').length,
    missing: params.results.filter((item) => item.status === 'MISSING_IN_UI')
      .length,
    extra: params.results.filter((item) => item.status === 'EXTRA_IN_UI')
      .length,
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Figma vs UI Inspection Report</title>

<style>
body {
  font-family: Arial, sans-serif;
  padding: 24px;
  background: #f5f5f5;
  color: #222;
}

.card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 16px;
  font-size: 13px;
}

th, td {
  border: 1px solid #ddd;
  padding: 8px;
  vertical-align: top;
  text-align: left;
}

th {
  background: #eee;
}

.pass {
  background: #eefaf0;
}

.warning {
  background: #fff8e5;
}

.missing_in_ui {
  background: #ffecec;
}

.extra_in_ui {
  background: #eef5ff;
}

img {
  max-width: 100%;
  border: 1px solid #ddd;
  border-radius: 8px;
}

code {
  background: #eee;
  padding: 2px 4px;
  border-radius: 4px;
}

.summary {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.summary-item {
  background: #f1f1f1;
  border-radius: 6px;
  padding: 8px 12px;
}
</style>
</head>

<body>

<h1>Figma vs UI Inspection Report</h1>

<div class="card">
  <p><strong>Name:</strong> ${escapeHtml(params.name)}</p>
  <p><strong>Figma URL:</strong> ${escapeHtml(params.figmaUrl)}</p>
  <p><strong>Page URL:</strong> ${escapeHtml(params.url)}</p>
  <p><strong>Selector:</strong> <code>${escapeHtml(params.selector)}</code></p>
  <p><strong>Device:</strong> ${escapeHtml(params.device)}</p>
  <p><strong>Viewport:</strong> ${params.viewport.width}x${params.viewport.height}</p>
</div>

<div class="card">
  <h2>Summary</h2>
  <div class="summary">
    <div class="summary-item">Total: ${summary.total}</div>
    <div class="summary-item">✅ Pass: ${summary.pass}</div>
    <div class="summary-item">⚠️ Warning: ${summary.warning}</div>
    <div class="summary-item">❌ Missing in UI: ${summary.missing}</div>
    <div class="summary-item">ℹ️ Extra in UI: ${summary.extra}</div>
  </div>
</div>

<div class="card">
  <h2>UI Screenshot</h2>
  <img src="./${escapeHtml(params.screenshotFileName)}" />
</div>

<div class="card">
  <h2>Comparison Details</h2>

  <table>
    <thead>
      <tr>
        <th>Status</th>
        <th>Text</th>
        <th>Figma Font</th>
        <th>UI Font</th>
        <th>Figma Size</th>
        <th>UI Size</th>
        <th>Figma Line Height</th>
        <th>UI Line Height</th>
        <th>Figma Weight</th>
        <th>UI Weight</th>
        <th>Figma Color</th>
        <th>UI Color</th>
        <th>Differences</th>
      </tr>
    </thead>

    <tbody>
      ${rows}
    </tbody>
  </table>
</div>

</body>
</html>
`;
}