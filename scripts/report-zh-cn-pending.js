const fs = require('fs');
const path = require('path');

const overlayPath = path.join(__dirname, '..', 'locales', 'zh-CN', 'items.overlay.json');
const overlay = JSON.parse(fs.readFileSync(overlayPath, 'utf8'));

const pending = overlay.entries
  .filter((entry) => entry.status === 'pending')
  .map((entry) => ({
    entryKey: entry.entryKey,
    id: entry.source.itemIdValue,
    label: entry.source.itemIdLabel,
    title: entry.source.title,
    section: entry.source.sectionHeading,
    body: entry.source.body,
  }));

console.log(JSON.stringify({
  totalPending: pending.length,
  entries: pending,
}, null, 2));
