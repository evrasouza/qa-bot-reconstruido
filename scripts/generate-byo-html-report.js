const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(
  process.cwd(),
  'api-exports',
  'byo-units-bundled-features-with-type-name.json'
);

const OUTPUT_FILE = path.join(
  process.cwd(),
  'api-exports',
  'byo-units-bundled-features-report.html'
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

const cards = data.map(item => {
  const unitsHtml = (item.units || []).map(unit => {
    const featuresRows = (unit.bundledFeatures || []).map(feature => `
      <tr>
        <td>${escapeHtml(feature.featureId)}</td>
        <td>${escapeHtml(feature.featureName)}</td>
        <td><span class="tag">${escapeHtml(feature.typeId)}</span></td>
        <td>${escapeHtml(feature.typeName)}</td>
      </tr>
    `).join('');

    return `
      <div class="unit">
        <h3>Unit: ${escapeHtml(unit.unitId)}</h3>

        <div class="summary">
          ${escapeHtml(unit.bundledFeatureTypeIdsText)}
        </div>

        <table>
          <thead>
            <tr>
              <th>Feature ID</th>
              <th>Feature Name</th>
              <th>Type ID</th>
              <th>Type Name</th>
            </tr>
          </thead>
          <tbody>
            ${featuresRows}
          </tbody>
        </table>
      </div>
    `;
  }).join('');

  return `
    <section 
      class="card"
      data-country="${escapeHtml(item.countryCode)}"
      data-brand="${escapeHtml(item.brand)}"
      data-year="${escapeHtml(item.year)}"
      data-model="${escapeHtml(item.model)}"
      data-package="${escapeHtml(item.packageId)}"
      data-locale="${escapeHtml(item.locale)}"
      data-status="${escapeHtml(item.status)}"
    >
      <div class="card-header">
        <div>
          <h2>${escapeHtml(item.brand)} / ${escapeHtml(item.model)}</h2>
          <p>
            <strong>Country:</strong> ${escapeHtml(item.countryCode)}
            · <strong>Year:</strong> ${escapeHtml(item.year)}
            · <strong>Package:</strong> ${escapeHtml(item.packageId)}
            · <strong>Locale:</strong> ${escapeHtml(item.locale)}
          </p>
        </div>
        <span class="status status-${escapeHtml(item.status)}">${escapeHtml(item.status)}</span>
      </div>

      ${unitsHtml || '<p class="empty">No units returned.</p>'}
    </section>
  `;
}).join('');

const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>BYO Units Bundled Features Report</title>
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

    .filters {
      display: grid;
      grid-template-columns: repeat(6, minmax(120px, 1fr));
      gap: 12px;
      margin-bottom: 24px;
      background: #fff;
      padding: 16px;
      border-radius: 12px;
      box-shadow: 0 1px 4px rgba(0,0,0,.08);
      position: sticky;
      top: 0;
      z-index: 10;
    }

    input {
      padding: 10px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 14px;
    }

    .counter {
      margin-bottom: 16px;
      font-weight: bold;
    }

    .card {
      background: #fff;
      border-radius: 14px;
      padding: 18px;
      margin-bottom: 18px;
      box-shadow: 0 1px 6px rgba(0,0,0,.08);
      border-left: 6px solid #2563eb;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-start;
      margin-bottom: 14px;
    }

    .card h2 {
      margin: 0 0 6px 0;
      font-size: 20px;
    }

    .card p {
      margin: 0;
      color: #4b5563;
    }

    .status {
      padding: 6px 10px;
      border-radius: 999px;
      background: #e5e7eb;
      font-weight: bold;
      font-size: 13px;
    }

    .status-200 {
      background: #dcfce7;
      color: #166534;
    }

    .unit {
      margin-top: 16px;
      padding: 14px;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      background: #fafafa;
    }

    .unit h3 {
      margin: 0 0 10px 0;
      font-size: 16px;
    }

    .summary {
      font-size: 13px;
      color: #374151;
      background: #eef2ff;
      padding: 10px;
      border-radius: 8px;
      margin-bottom: 12px;
      line-height: 1.5;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      background: #fff;
      border-radius: 10px;
      overflow: hidden;
    }

    th {
      background: #111827;
      color: #fff;
      text-align: left;
      padding: 10px;
      font-size: 13px;
    }

    td {
      border-bottom: 1px solid #e5e7eb;
      padding: 10px;
      font-size: 13px;
      vertical-align: top;
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

    .empty {
      padding: 12px;
      background: #fee2e2;
      color: #991b1b;
      border-radius: 8px;
    }

    .hidden {
      display: none;
    }
  </style>
</head>
<body>
  <h1>BYO Units Bundled Features Report</h1>
  <div class="subtitle">
    Total records loaded: ${data.length}
  </div>

  <div class="filters">
    <input id="countryFilter" placeholder="Filter country..." />
    <input id="brandFilter" placeholder="Filter brand..." />
    <input id="modelFilter" placeholder="Filter model..." />
    <input id="packageFilter" placeholder="Filter package..." />
    <input id="localeFilter" placeholder="Filter locale..." />
    <input id="typeFilter" placeholder="Filter type/name..." />
  </div>

  <div class="counter" id="counter"></div>

  <main id="report">
    ${cards}
  </main>

  <script>
    const filters = {
      country: document.getElementById('countryFilter'),
      brand: document.getElementById('brandFilter'),
      model: document.getElementById('modelFilter'),
      package: document.getElementById('packageFilter'),
      locale: document.getElementById('localeFilter'),
      type: document.getElementById('typeFilter'),
    };

    const cards = Array.from(document.querySelectorAll('.card'));
    const counter = document.getElementById('counter');

    function applyFilters() {
      let visible = 0;

      cards.forEach(card => {
        const text = card.innerText.toLowerCase();

        const matches =
          card.dataset.country.toLowerCase().includes(filters.country.value.toLowerCase()) &&
          card.dataset.brand.toLowerCase().includes(filters.brand.value.toLowerCase()) &&
          card.dataset.model.toLowerCase().includes(filters.model.value.toLowerCase()) &&
          card.dataset.package.toLowerCase().includes(filters.package.value.toLowerCase()) &&
          card.dataset.locale.toLowerCase().includes(filters.locale.value.toLowerCase()) &&
          text.includes(filters.type.value.toLowerCase());

        card.classList.toggle('hidden', !matches);

        if (matches) visible++;
      });

      counter.innerText = 'Visible records: ' + visible + ' / ' + cards.length;
    }

    Object.values(filters).forEach(input => {
      input.addEventListener('input', applyFilters);
    });

    applyFilters();
  </script>
</body>
</html>
`;

fs.writeFileSync(OUTPUT_FILE, html, 'utf-8');

console.log(`HTML report generated at: ${OUTPUT_FILE}`);