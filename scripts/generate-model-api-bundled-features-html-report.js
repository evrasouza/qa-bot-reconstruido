const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(
  process.cwd(),
  'api-exports',
  'model-api-bundled-features-by-unit-seadoo.json'
);

const OUTPUT_FILE = path.join(
  process.cwd(),
  'reports',
  'model-api-bundled-features-report-seadoo.html'
);

if (!fs.existsSync(INPUT_FILE)) {
  throw new Error(`Input file not found: ${INPUT_FILE}`);
}

const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

const rows = [];

for (const item of data) {
  for (const unit of item.units || []) {
    for (const feature of unit.bundledFeatures || []) {
      rows.push({
        lineup: item.lineup,
        modelYear: item.modelYear,
        family: item.family,
        packageId: item.packageId,
        locale: item.locale,
        status: item.status,
        unitId: unit.unitId,
        unitName: unit.unitName,
        platform: unit.platform,
        featureId: feature.featureId,
        featureName: feature.featureName,
        typeId: feature.typeId,
        typeName: feature.typeName
      });
    }
  }
}

const tableRows = rows.map(row => `
  <tr>
    <td>${escapeHtml(row.lineup)}</td>
    <td>${escapeHtml(row.modelYear)}</td>
    <td>${escapeHtml(row.family)}</td>
    <td>${escapeHtml(row.packageId)}</td>
    <td>${escapeHtml(row.locale)}</td>
    <td>${escapeHtml(row.status)}</td>
    <td>${escapeHtml(row.unitId)}</td>
    <td>${escapeHtml(row.unitName)}</td>
    <td>${escapeHtml(row.platform)}</td>
    <td>${escapeHtml(row.featureId)}</td>
    <td>${escapeHtml(row.featureName)}</td>
    <td><span class="tag">${escapeHtml(row.typeId)}</span></td>
    <td>${escapeHtml(row.typeName)}</td>
  </tr>
`).join('');

const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Model API Bundled Features Report</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background: #f4f6f8;
      margin: 0;
      padding: 24px;
      color: #1f2937;
    }

    h1 {
      margin-bottom: 8px;
    }

    .subtitle {
      color: #6b7280;
      margin-bottom: 24px;
    }

    .toolbar {
      background: #fff;
      padding: 16px;
      border-radius: 12px;
      box-shadow: 0 1px 4px rgba(0,0,0,.08);
      position: sticky;
      top: 0;
      z-index: 10;
      margin-bottom: 16px;
    }

    input {
      width: 100%;
      box-sizing: border-box;
      padding: 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 14px;
      margin-bottom: 10px;
    }

    .counter {
      font-weight: bold;
    }

    .table-wrapper {
      background: #fff;
      border-radius: 12px;
      overflow: auto;
      box-shadow: 0 1px 6px rgba(0,0,0,.08);
      max-height: 75vh;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 1600px;
    }

    thead th {
      position: sticky;
      top: 0;
      background: #111827;
      color: #fff;
      text-align: left;
      padding: 10px;
      font-size: 13px;
      z-index: 5;
      white-space: nowrap;
    }

    td {
      border-bottom: 1px solid #e5e7eb;
      padding: 10px;
      font-size: 13px;
      vertical-align: top;
    }

    tr:hover {
      background: #f9fafb;
    }

    .tag {
      display: inline-block;
      background: #dbeafe;
      color: #1d4ed8;
      padding: 4px 8px;
      border-radius: 999px;
      font-weight: bold;
      font-size: 12px;
      white-space: nowrap;
    }

    .hidden {
      display: none;
    }
  </style>
</head>
<body>
  <h1>Model API Bundled Features Report</h1>

  <div class="subtitle">
    Total rows loaded: ${rows.length}
  </div>

  <div class="toolbar">
    <input id="searchInput" placeholder="Search anything: lineup, family, package, locale, unit, typeId, typeName, featureName..." />
    <div class="counter" id="counter"></div>
  </div>

  <div class="table-wrapper">
    <table>
      <thead>
        <tr>
          <th>Lineup</th>
          <th>Year</th>
          <th>Family</th>
          <th>Package</th>
          <th>Locale</th>
          <th>Status</th>
          <th>Unit ID</th>
          <th>Unit Name</th>
          <th>Platform</th>
          <th>Feature ID</th>
          <th>Feature Name</th>
          <th>Type ID</th>
          <th>Type Name</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  </div>

  <script>
    const input = document.getElementById('searchInput');
    const rows = Array.from(document.querySelectorAll('tbody tr'));
    const counter = document.getElementById('counter');

    function applyFilter() {
      const term = input.value.toLowerCase();
      let visible = 0;

      rows.forEach(row => {
        const match = row.innerText.toLowerCase().includes(term);
        row.classList.toggle('hidden', !match);
        if (match) visible++;
      });

      counter.innerText = 'Visible rows: ' + visible + ' / ' + rows.length;
    }

    input.addEventListener('input', applyFilter);
    applyFilter();
  </script>
</body>
</html>
`;

fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
fs.writeFileSync(OUTPUT_FILE, html, 'utf-8');

console.log(`HTML report generated at: ${OUTPUT_FILE}`);