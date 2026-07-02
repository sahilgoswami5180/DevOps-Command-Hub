import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dataDir = path.join(root, 'public', 'data');
const newFile = path.join(dataDir, 'sahil-share-links-ops.commands.json');
const categoriesFile = path.join(dataDir, 'categories.json');

function normalizeCommand(command) {
  return String(command || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/"[^"]*"/g, '"..."')
    .replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, 'IP')
    .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, 'EMAIL')
    .trim();
}

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}

if (!fs.existsSync(newFile)) {
  console.error('Missing file:', newFile);
  process.exit(1);
}

const existing = new Set();
for (const file of fs.readdirSync(dataDir).filter((f) => f.endsWith('.commands.json') && f !== 'sahil-share-links-ops.commands.json')) {
  const rows = readJson(path.join(dataDir, file), []);
  for (const row of rows) existing.add(normalizeCommand(row.command));
}

const incoming = readJson(newFile, []);
const seenIncoming = new Set();
const unique = [];
let skipped = 0;
for (const row of incoming) {
  const key = normalizeCommand(row.command);
  if (!key || existing.has(key) || seenIncoming.has(key)) { skipped++; continue; }
  seenIncoming.add(key);
  unique.push(row);
}
fs.writeFileSync(newFile, `${JSON.stringify(unique, null, 2)}\n`);

let categories = readJson(categoriesFile, []);
const entry = {
  id: 'sahil-share-links-ops',
  name: 'Sahil Share Links Ops',
  label: 'Sahil Share Links Ops',
  file: 'sahil-share-links-ops.commands.json',
  description: 'Important Sahil-Chats share link commands: SSH, SCP, Git, server updates, Caddy, Laravel, WordPress, DB restore, AWS/GCP, DNS and debugging.'
};

if (Array.isArray(categories)) {
  const exists = categories.some((c) => c.id === entry.id || c.file === entry.file || c.name === entry.name || c.label === entry.label);
  if (!exists) categories.push(entry);
  fs.writeFileSync(categoriesFile, `${JSON.stringify(categories, null, 2)}\n`);
} else {
  console.warn('categories.json is not an array, category was not auto-added. Add this manually:', entry);
}

console.log(`Imported ${unique.length} unique commands. Skipped ${skipped} duplicate/empty commands.`);
console.log('Updated:', path.relative(root, newFile));
console.log('Updated:', path.relative(root, categoriesFile));
