const fs = require('fs');
const path = require('path');

const resultsDir = path.join(process.cwd(), 'allure-results');
const tempHistoryDir = path.join(process.cwd(), '.allure-history-temp');

function deleteDirContents(dir) {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    fs.rmSync(fullPath, { recursive: true, force: true });
  }
}

// 1. salva history atual, se existir
const currentHistory = path.join(resultsDir, 'history');

if (fs.existsSync(currentHistory)) {
  fs.rmSync(tempHistoryDir, { recursive: true, force: true });
  fs.mkdirSync(tempHistoryDir, { recursive: true });

  for (const file of fs.readdirSync(currentHistory)) {
    fs.copyFileSync(
      path.join(currentHistory, file),
      path.join(tempHistoryDir, file)
    );
  }

  console.log('Saved existing allure history temporarily.');
}

// 2. limpa allure-results inteiro
fs.mkdirSync(resultsDir, { recursive: true });
deleteDirContents(resultsDir);

// 3. restaura history temporário dentro de allure-results/history
if (fs.existsSync(tempHistoryDir)) {
  const restoredHistory = path.join(resultsDir, 'history');
  fs.mkdirSync(restoredHistory, { recursive: true });

  for (const file of fs.readdirSync(tempHistoryDir)) {
    fs.copyFileSync(
      path.join(tempHistoryDir, file),
      path.join(restoredHistory, file)
    );
  }

  fs.rmSync(tempHistoryDir, { recursive: true, force: true });
  console.log('Restored allure history into clean allure-results.');
}

console.log('allure-results reset completed.');