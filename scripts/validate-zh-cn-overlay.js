const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const seedPath = path.join(rootDir, 'locales', 'en-US', 'items.seed.json');
const overlayPath = path.join(rootDir, 'locales', 'zh-CN', 'items.overlay.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function main() {
  const seed = readJson(seedPath);
  const overlay = readJson(overlayPath);

  const seedKeys = new Set(seed.entries.map((entry) => entry.entryKey));
  const overlayEntries = Array.isArray(overlay.entries) ? overlay.entries : [];
  const overlayKeys = new Set(overlayEntries.map((entry) => entry.entryKey));

  const missingKeys = Array.from(seedKeys).filter((key) => !overlayKeys.has(key));
  const extraKeys = Array.from(overlayKeys).filter((key) => !seedKeys.has(key));

  const invalidEntries = [];
  const statusSummary = {
    pending: 0,
    translated: 0,
    reviewed: 0,
    other: 0,
  };

  for (const entry of overlayEntries) {
    const problems = [];
    if (!entry.entryKey || !seedKeys.has(entry.entryKey)) {
      problems.push('invalid entryKey');
    }
    if (!['pending', 'translated', 'reviewed'].includes(entry.status)) {
      problems.push('invalid status');
      statusSummary.other += 1;
    } else {
      statusSummary[entry.status] += 1;
    }
    if (!isObject(entry.source)) {
      problems.push('missing source');
    }
    if (!isObject(entry.translation)) {
      problems.push('missing translation');
    } else {
      if (!Array.isArray(entry.translation.body)) {
        problems.push('translation.body must be an array');
      }
      if (!isObject(entry.translation.meta)) {
        problems.push('translation.meta must be an object');
      }
      if (!Array.isArray(entry.translation.searchAliases)) {
        problems.push('translation.searchAliases must be an array');
      }
      if (!Array.isArray(entry.translation.references)) {
        problems.push('translation.references must be an array');
      }
    }
    if (problems.length > 0) {
      invalidEntries.push({
        entryKey: entry.entryKey || '',
        problems,
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        totalSeedEntries: seed.entries.length,
        totalOverlayEntries: overlayEntries.length,
        missingKeys,
        extraKeys,
        invalidEntries,
        statusSummary,
      },
      null,
      2
    )
  );

  if (missingKeys.length > 0 || extraKeys.length > 0 || invalidEntries.length > 0) {
    process.exitCode = 1;
  }
}

main();
