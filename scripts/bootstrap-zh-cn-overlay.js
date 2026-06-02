const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const seedPath = path.join(rootDir, 'locales', 'en-US', 'items.seed.json');
const overlayPath = path.join(rootDir, 'locales', 'zh-CN', 'items.overlay.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function hasNonEmptyTranslation(translation) {
  return Boolean(
    translation.title ||
      translation.pickup ||
      translation.unlock ||
      translation.notes ||
      (Array.isArray(translation.body) && translation.body.length > 0) ||
      (Array.isArray(translation.searchAliases) && translation.searchAliases.length > 0) ||
      (translation.meta && Object.keys(translation.meta).length > 0)
  );
}

function createDefaultTranslation() {
  return {
    title: '',
    pickup: '',
    body: [],
    unlock: '',
    meta: {},
    searchAliases: [],
    notes: '',
    references: [],
  };
}

function createSourceSnapshot(seedEntry) {
  return {
    family: seedEntry.family,
    variant: seedEntry.variant,
    tid: seedEntry.tid,
    sid: seedEntry.sid,
    cid: seedEntry.cid,
    sectionHeading: seedEntry.section.heading,
    itemIdLabel: seedEntry.itemIdLabel,
    itemIdValue: seedEntry.itemIdValue,
    title: seedEntry.title,
    pickup: seedEntry.pickup,
    quality: seedEntry.quality,
    body: seedEntry.body,
    unlock: seedEntry.unlock,
    meta: seedEntry.meta,
    tags: seedEntry.tags,
    searchAliases: seedEntry.searchAliases,
  };
}

function normalizeOverlayEntry(seedEntry, previousEntry) {
  const translation = previousEntry && previousEntry.translation
    ? {
        title: previousEntry.translation.title || '',
        pickup: previousEntry.translation.pickup || '',
        body: Array.isArray(previousEntry.translation.body) ? previousEntry.translation.body : [],
        unlock: previousEntry.translation.unlock || '',
        meta:
          previousEntry.translation.meta && typeof previousEntry.translation.meta === 'object'
            ? previousEntry.translation.meta
            : {},
        searchAliases: Array.isArray(previousEntry.translation.searchAliases)
          ? previousEntry.translation.searchAliases
          : [],
        notes: previousEntry.translation.notes || '',
        references: Array.isArray(previousEntry.translation.references)
          ? previousEntry.translation.references
          : [],
      }
    : createDefaultTranslation();

  const status =
    previousEntry && previousEntry.status
      ? previousEntry.status
      : hasNonEmptyTranslation(translation)
        ? 'translated'
        : 'pending';

  return {
    entryKey: seedEntry.entryKey,
    status,
    source: createSourceSnapshot(seedEntry),
    translation,
  };
}

function main() {
  const seed = readJson(seedPath);
  const previous = fs.existsSync(overlayPath) ? readJson(overlayPath) : null;
  const previousMap = new Map(
    previous && Array.isArray(previous.entries)
      ? previous.entries.map((entry) => [entry.entryKey, entry])
      : []
  );

  const entries = seed.entries.map((seedEntry) =>
    normalizeOverlayEntry(seedEntry, previousMap.get(seedEntry.entryKey))
  );

  const pendingEntries = entries.filter((entry) => entry.status === 'pending').length;
  const translatedEntries = entries.filter((entry) => entry.status === 'translated').length;
  const reviewedEntries = entries.filter((entry) => entry.status === 'reviewed').length;

  const output = {
    generatedAt: new Date().toISOString(),
    locale: 'zh-CN',
    sourceSeed: '../en-US/items.seed.json',
    sourceSeedGeneratedAt: seed.generatedAt,
    totalEntries: seed.totalEntries,
    keyFormat: seed.keyFormat,
    statusSummary: {
      pending: pendingEntries,
      translated: translatedEntries,
      reviewed: reviewedEntries,
    },
    entries,
  };

  writeJson(overlayPath, output);

  console.log(
    JSON.stringify(
      {
        overlayPath,
        totalEntries: output.totalEntries,
        statusSummary: output.statusSummary,
      },
      null,
      2
    )
  );
}

main();
