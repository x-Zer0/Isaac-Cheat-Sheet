const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const seedPath = path.join(rootDir, 'locales', 'en-US', 'items.seed.json');
const overlayPath = path.join(rootDir, 'locales', 'zh-CN', 'items.overlay.json');
const outputDir = path.join(rootDir, 'assets', 'data');
const outputPath = path.join(outputDir, 'i18n-items.json');
const outputScriptPath = path.join(outputDir, 'i18n-items.js');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function writeScript(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    'window.__ITEM_I18N__ = ' + JSON.stringify(value, null, 2) + ';\n',
    'utf8'
  );
}

function buildBaseEntry(seedEntry) {
  return {
    entryKey: seedEntry.entryKey,
    family: seedEntry.family,
    variant: seedEntry.variant,
    tid: seedEntry.tid,
    sid: seedEntry.sid,
    cid: seedEntry.cid,
    itemIdLabel: seedEntry.itemIdLabel,
    itemIdValue: seedEntry.itemIdValue,
    quality: seedEntry.quality,
    meta: seedEntry.meta,
    tags: seedEntry.tags,
    sectionHeading: seedEntry.section.heading,
    title: seedEntry.title,
    pickup: seedEntry.pickup,
    body: seedEntry.body,
    unlock: seedEntry.unlock,
    searchAliases: seedEntry.searchAliases,
  };
}

function buildLocaleEntry(seedEntry, overlayEntry) {
    const translation = overlayEntry ? overlayEntry.translation : null;
    const mergedAliases = Array.from(
    new Set([
      ...(seedEntry.searchAliases || []),
      ...((translation && translation.searchAliases) || []),
    ].filter(Boolean))
  );

    return {
        entryKey: seedEntry.entryKey,
        title: translation && translation.title ? translation.title : seedEntry.title,
        pickup: translation && translation.pickup ? translation.pickup : seedEntry.pickup,
        body: translation && Array.isArray(translation.body) && translation.body.length > 0 ? translation.body : seedEntry.body,
        unlock: translation && translation.unlock ? translation.unlock : seedEntry.unlock,
        meta: translation && translation.meta && Object.keys(translation.meta).length > 0 ? translation.meta : seedEntry.meta,
        searchAliases: mergedAliases,
    };
}

function main() {
  const seed = readJson(seedPath);
  const overlay = readJson(overlayPath);
  const overlayMap = new Map((overlay.entries || []).map((entry) => [entry.entryKey, entry]));

  const baseEntries = seed.entries.map(buildBaseEntry);
  const zhEntries = seed.entries.map((seedEntry) => buildLocaleEntry(seedEntry, overlayMap.get(seedEntry.entryKey)));

  const output = {
    generatedAt: new Date().toISOString(),
    defaultLocale: 'zh-CN',
    entries: baseEntries,
    locales: {
      'en-US': Object.fromEntries(baseEntries.map((entry) => [entry.entryKey, {
        entryKey: entry.entryKey,
        title: entry.title,
        pickup: entry.pickup,
        body: entry.body,
        unlock: entry.unlock,
        meta: entry.meta,
        searchAliases: entry.searchAliases,
      }])),
      'zh-CN': Object.fromEntries(zhEntries.map((entry) => [entry.entryKey, entry])),
    },
  };

  writeJson(outputPath, output);
  writeScript(outputScriptPath, output);

  console.log(JSON.stringify({
    outputPath,
    outputScriptPath,
    totalEntries: baseEntries.length,
    locales: Object.keys(output.locales),
  }, null, 2));
}

main();
