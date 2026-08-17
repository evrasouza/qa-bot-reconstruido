const fs = require('fs');
const path = require('path');

const inputFile = path.join(process.cwd(), 'test-results', 'consents', 'consents-results.json');
const outputFile = path.join(process.cwd(), 'test-results', 'consents', 'consents-report.html');

if (!fs.existsSync(inputFile)) {
  throw new Error(`Results file not found: ${inputFile}`);
}

const results = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));

const total = results.length;
const passed = results.filter(r => r.passed).length;
const failed = total - passed;
const avgDuration = total
  ? Math.round(results.reduce((sum, r) => sum + r.durationMs, 0) / total)
  : 0;

const rows = results.map(r => `
<tr class="${r.passed ? 'passed' : 'failed'}">
  <td>${r.passed ? '✅ Passed' : '❌ Failed'}</td>
  <td>${r.method}</td>
  <td><code>${r.url}</code></td>
  <td>${r.status}</td>
  <td>${r.durationMs} ms</td>
  <td>${new Date(r.timestamp).toLocaleString()}</td>
  <td>${r.testName}</td>
  <td><pre>${r.error || '-'}</pre></td>
</tr>
`).join('');

const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Consent API Report</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background: #f5f7fa;
      color: #1f2937;
      margin: 40px;
    }

    h1 {
      margin-bottom: 4px;
    }

    .subtitle {
      color: #6b7280;
      margin-bottom: 24px;
    }

    .summary {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .card {
      background: white;
      padding: 18px 22px;
      border-radius: 10px;
      min-width: 150px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .card span {
      color: #6b7280;
      font-size: 13px;
    }

    .card strong {
      display: block;
      font-size: 28px;
      margin-top: 6px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    th, td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
      text-align: left;
      vertical-align: top;
      font-size: 13px;
    }

    th {
      background: #111827;
      color: white;
      position: sticky;
      top: 0;
    }

    tr.passed {
      background: #f0fdf4;
    }

    tr.failed {
      background: #fef2f2;
    }

    code {
      word-break: break-all;
      white-space: normal;
    }

    pre {
      white-space: pre-wrap;
      margin: 0;
      font-size: 12px;
    }

    .footer {
      margin-top: 20px;
      color: #6b7280;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <h1>Consent API Automation Report</h1>
  <div class="subtitle">Generated from Playwright API execution results.</div>

  <div class="summary">
    <div class="card"><span>Total Requests</span><strong>${total}</strong></div>
    <div class="card"><span>Passed</span><strong>${passed}</strong></div>
    <div class="card"><span>Failed</span><strong>${failed}</strong></div>
    <div class="card"><span>Average Duration</span><strong>${avgDuration} ms</strong></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Status</th>
        <th>Method</th>
        <th>URL</th>
        <th>Status Code</th>
        <th>Duration</th>
        <th>Timestamp</th>
        <th>Test</th>
        <th>Error</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="footer">
    Report generated at ${new Date().toLocaleString()}
  </div>
</body>
</html>
`;

fs.writeFileSync(outputFile, html);

console.log(`Consent report generated: ${outputFile}`);
