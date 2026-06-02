const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const indexPath = path.join(rootDir, 'index.html');
const outputPath = path.join(rootDir, 'locales', 'en-US', 'items.seed.json');

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function decodeHtml(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripTags(text) {
  return decodeHtml(text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
}

function normalizeText(text) {
  return decodeHtml(text).replace(/\s+/g, ' ').trim();
}

function parseAttributes(openTag) {
  const attrs = {};
  const attrRe = /([a-zA-Z0-9:-]+)="([^"]*)"/g;
  let match;
  while ((match = attrRe.exec(openTag))) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

function inferSectionFamily(sectionClass, itemIdLabel) {
  if (itemIdLabel === 'TrinketID') {
    return 'trinket';
  }
  if (itemIdLabel === 'CardID') {
    return 'card';
  }
  if (sectionClass.includes('trinkets-container')) {
    return 'trinket';
  }
  if (sectionClass.includes('tarot-container')) {
    return 'card';
  }
  return 'collectible';
}

function inferVariant(title, body) {
  const lowerTitle = title.toLowerCase();
  if (/\(tainted\)/i.test(title)) {
    return 'tainted';
  }
  if (body.some((line) => /see next icon for tainted character effects/i.test(line))) {
    return 'base';
  }
  if (body.some((line) => /see previous icon for normal character effects/i.test(line))) {
    return 'tainted';
  }
  if (lowerTitle.endsWith(' tainted')) {
    return 'tainted';
  }
  return 'base';
}

function buildTitleSuffix(title, variant) {
  if (variant === 'tainted') {
    return 'tainted';
  }
  return '';
}

function splitCsvLike(text) {
  return text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseMetaLines(lines) {
  const meta = {};
  for (const line of lines) {
    const idx = line.indexOf(':');
    if (idx < 0) {
      continue;
    }
    const label = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (!value) {
      continue;
    }
    if (label === 'item pool') {
      meta.itemPools = splitCsvLike(value);
      continue;
    }
    if (label === 'type') {
      meta.type = value;
      continue;
    }
    meta[label] = value;
  }
  return meta;
}

function buildEntryKey(entry) {
  return [entry.family, entry.sid, entry.tid, entry.variant].join(':');
}

function extractSectionMap(html) {
  const sectionRe = /<div class="([^"]*?(?:items-container|trinkets-container|tarot-container)[^"]*)">[\s\S]*?<h2>([^<]+)<\/h2>/g;
  const sections = [];
  let match;
  while ((match = sectionRe.exec(html))) {
    sections.push({
      index: match.index,
      className: match[1],
      heading: stripTags(match[2]),
    });
  }
  return sections;
}

function findSection(sections, index) {
  let current = sections[0] || { className: '', heading: '' };
  for (const section of sections) {
    if (section.index > index) {
      break;
    }
    current = section;
  }
  return current;
}

function parseTextbox(html, sections) {
  const liRe = /<li class="textbox"([^>]*)>([\s\S]*?)<\/li>/g;
  const results = [];
  let match;

  while ((match = liRe.exec(html))) {
    const attrs = parseAttributes(match[1]);
    const block = match[2];
    const section = findSection(sections, match.index);

    const titleMatch = block.match(/<p class="item-title">([\s\S]*?)<\/p>/);
    const idMatch = block.match(/<p class="r-itemid">([\s\S]*?)<\/p>/);
    const pickupMatch = block.match(/<p class="pickup">([\s\S]*?)<\/p>/);
    const qualityMatch = block.match(/<p class="quality">Quality:\s*([^<]+)<\/p>/);
    const unlockMatch = block.match(/<p class="r-unlock">([\s\S]*?)<\/p>/);
    const tagsMatch = block.match(/<p class="tags">([\s\S]*?)<\/p>/);
    const ulMatch = block.match(/<ul>([\s\S]*?)<\/ul>/);

    const body = [];
    const metaLines = [];
    const bodyRe = /<p(?: class="([^"]+)")?>([\s\S]*?)<\/p>/g;
    let bodyMatch;

    while ((bodyMatch = bodyRe.exec(block))) {
      const cls = bodyMatch[1] || '';
      const text = normalizeText(stripTags(bodyMatch[2]));
      if (!text) {
        continue;
      }
      if (
        cls === 'item-title' ||
        cls === 'r-itemid' ||
        cls === 'pickup' ||
        cls === 'quality' ||
        cls === 'r-unlock' ||
        cls === 'tags'
      ) {
        continue;
      }
      if (ulMatch && bodyMatch.index > ulMatch.index && bodyMatch.index < ulMatch.index + ulMatch[0].length) {
        metaLines.push(text);
      } else {
        body.push(text);
      }
    }

    const itemIdText = idMatch ? normalizeText(stripTags(idMatch[1])) : '';
    const itemIdLabel = itemIdText.includes(':') ? itemIdText.split(':')[0].trim() : '';
    const itemIdValue = itemIdText.includes(':') ? itemIdText.split(':').slice(1).join(':').trim() : '';
    const title = titleMatch ? normalizeText(stripTags(titleMatch[1])) : '';
    const family = inferSectionFamily(section.className, itemIdLabel);
    const variant = inferVariant(title, body);
    const titleSuffix = buildTitleSuffix(title, variant);

    const entry = {
      entryKey: '',
      family,
      variant,
      section: {
        className: section.className,
        heading: section.heading,
      },
      title,
      titleSuffix,
      tid: attrs['data-tid'] || '',
      sid: attrs['data-sid'] || '',
      cid: attrs['data-cid'] || '',
      itemIdLabel,
      itemIdValue,
      pickup: pickupMatch ? normalizeText(stripTags(pickupMatch[1])) : '',
      quality: qualityMatch ? normalizeText(qualityMatch[1]) : '',
      body,
      unlock: unlockMatch ? normalizeText(stripTags(unlockMatch[1])) : '',
      meta: parseMetaLines(metaLines),
      tags: tagsMatch ? splitCsvLike(normalizeText(stripTags(tagsMatch[1]))) : [],
      searchAliases: Array.from(new Set([title].filter(Boolean))),
    };

    entry.entryKey = buildEntryKey(entry);
    results.push(entry);
  }

  return results;
}

function buildOutput(entries) {
  return {
    generatedAt: new Date().toISOString(),
    source: 'index.html',
    totalEntries: entries.length,
    keyFormat: 'family:sid:tid:variant',
    entries,
  };
}

function main() {
  const html = readFile(indexPath);
  const sections = extractSectionMap(html);
  const entries = parseTextbox(html, sections);
  writeJson(outputPath, buildOutput(entries));

  const keyCounts = new Map();
  for (const entry of entries) {
    keyCounts.set(entry.entryKey, (keyCounts.get(entry.entryKey) || 0) + 1);
  }
  const duplicateKeys = Array.from(keyCounts.entries()).filter(([, count]) => count > 1);

  console.log(
    JSON.stringify(
      {
        outputPath,
        totalEntries: entries.length,
        duplicateEntryKeys: duplicateKeys,
      },
      null,
      2
    )
  );
}

main();
