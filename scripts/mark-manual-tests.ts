import fs from "fs";
import path from "path";
const baseDir = "tests/auto";
function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(fullPath));
    else if (entry.isFile() && entry.name.endsWith('.spec.ts')) files.push(fullPath);
  }
  return files;
}
for (const filePath of walk(baseDir)) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('@manual')) continue;
  fs.writeFileSync(filePath, `// @manual\n// do not overwrite\n\n${content}`);
}
console.log('Done.');
