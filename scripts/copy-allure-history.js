const fs = require('fs');
const path = require('path');

const sourceDir = path.join(process.cwd(), 'allure-report', 'history');
const targetDir = path.join(process.cwd(), 'allure-results', 'history');

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    console.log('No previous Allure history found. Skipping copy.');
    return;
  }

  fs.mkdirSync(dest, { recursive: true });

  for (const item of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, item.name);
    const destPath = path.join(dest, item.name);

    if (item.isDirectory())  {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDirRecursive(sourceDir, targetDir);
console.log('Allure history copied successfully.');