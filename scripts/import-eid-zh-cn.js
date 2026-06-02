const fs = require('fs');
const path = require('path');
const https = require('https');

const rootDir = path.resolve(__dirname, '..');
const overlayPath = path.join(rootDir, 'locales', 'zh-CN', 'items.overlay.json');

const SOURCES = [
  {
    name: 'rep',
    url: 'https://raw.githubusercontent.com/wofsauge/External-Item-Descriptions/master/descriptions/rep/zh_cn.lua',
  },
  {
    name: 'rep+',
    url: 'https://raw.githubusercontent.com/wofsauge/External-Item-Descriptions/master/descriptions/rep+/zh_cn.lua',
  },
  {
    name: 'ab+',
    url: 'https://raw.githubusercontent.com/wofsauge/External-Item-Descriptions/master/descriptions/ab+/zh_cn.lua',
  },
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Request failed for ${url}: ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      })
      .on('error', reject);
  });
}

function splitTopLevelRows(blockText) {
  const rows = [];
  let current = '';
  let depth = 0;
  let inString = false;
  let prev = '';

  for (const ch of blockText) {
    current += ch;
    if (ch === '"' && prev !== '\\') {
      inString = !inString;
    } else if (!inString) {
      if (ch === '{') {
        depth += 1;
      } else if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          const row = current.trim();
          if (row) {
            rows.push(row);
          }
          current = '';
        }
      }
    }
    prev = ch;
  }

  return rows;
}

function parseLuaStringRows(blockText) {
  const result = new Map();
  for (const row of splitTopLevelRows(blockText)) {
    const parts = [...row.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((match) =>
      match[1].replace(/\\"/g, '"')
    );
    if (parts.length < 3) {
      continue;
    }
    const id = parts[0];
    const title = parts[1];
    const desc = parts[2];
    result.set(id, { id, title, desc });
  }
  return result;
}

function extractBracketBlock(text, openIndex) {
  if (openIndex < 0 || text[openIndex] !== '{') {
    return '';
  }

  let depth = 0;
  let inString = false;
  let prev = '';
  let end = -1;

  for (let i = openIndex; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"' && prev !== '\\') {
      inString = !inString;
    } else if (!inString) {
      if (ch === '{') {
        depth += 1;
      } else if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    prev = ch;
  }

  if (end < 0) {
    return '';
  }

  return text.slice(openIndex + 1, end);
}

function parseLuaTableByMarkers(text, markers) {
  for (const marker of markers) {
    const start = text.indexOf(marker);
    if (start < 0) {
      continue;
    }
    const open = text.indexOf('{', start);
    if (open < 0) {
      continue;
    }
    const body = extractBracketBlock(text, open);
    if (body) {
      return parseLuaStringRows(body);
    }
  }
  return new Map();
}

function parseLuaTable(text, tableName) {
  const legacyMarkers = [`EID.descriptions[languageCode].${tableName}=`, `EID.descriptions[languageCode].${tableName} =`];
  const localMap = {
    collectibles: ['local repCollectibles=', 'local repCollectibles ='],
    trinkets: ['local repTrinkets=', 'local repTrinkets ='],
    cards: ['local repCards=', 'local repCards ='],
  };

  const parsedLegacy = parseLuaTableByMarkers(text, legacyMarkers);
  if (parsedLegacy.size > 0) {
    return parsedLegacy;
  }

  const localMarkers = localMap[tableName] || [];
  return parseLuaTableByMarkers(text, localMarkers);
}

function parseMarkup(text) {
  return text
    .replace(/#\/?/g, '#')
    .split('#')
    .map((line) =>
      line
        .replace(/\{\{[^}]+\}\}/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter(Boolean);
}

function buildMetaFromLines(lines) {
  const meta = {};
  const body = [];

  for (const line of lines) {
    if (/^(↑|↓)?\s*射速修正|^(↑|↓)?\s*伤害修正|^(↑|↓)?\s*伤害[+-]|^(↑|↓)?\s*射速[+-]|^(↑|↓)?\s*移速[+-]|^(↑|↓)?\s*幸运[+-]|^(↑|↓)?\s*射程[+-]|^(↑|↓)?\s*弹速[+-]/.test(line)) {
      body.push(line);
      continue;
    }
    body.push(line);
  }

  if (Object.keys(meta).length === 0) {
    return { meta: {}, body };
  }

  return { meta, body };
}

function inferSourceTable(entry) {
  if (entry.source.itemIdLabel === 'ItemID') {
    return 'collectibles';
  }
  if (entry.source.itemIdLabel === 'TrinketID') {
    return 'trinkets';
  }
  if (entry.source.itemIdLabel === 'CardID') {
    return 'cards';
  }
  return null;
}

function mergeSearchAliases(existing, additions) {
  return Array.from(new Set([...(existing || []), ...(additions || [])].filter(Boolean)));
}

function hasManualBody(translation) {
  return Array.isArray(translation.body) && translation.body.length > 0;
}

async function main() {
  const overlay = readJson(overlayPath);
  const fetched = await Promise.all(
    SOURCES.map(async (source) => ({
      name: source.name,
      text: await fetchText(source.url),
    }))
  );

  const mergedTables = {
    collectibles: new Map(),
    trinkets: new Map(),
    cards: new Map(),
  };

  for (const source of fetched) {
    for (const tableName of Object.keys(mergedTables)) {
      const parsed = parseLuaTable(source.text, tableName);
      for (const [id, value] of parsed.entries()) {
        mergedTables[tableName].set(id, value);
      }
    }
  }

  let importedCount = 0;

  for (const entry of overlay.entries) {
    const tableName = inferSourceTable(entry);
    if (!tableName) {
      continue;
    }
    const match = mergedTables[tableName].get(entry.source.itemIdValue);
    if (!match) {
      continue;
    }

    const parsedLines = parseMarkup(match.desc);
    const normalized = buildMetaFromLines(parsedLines);

    if (!entry.translation.title) {
      entry.translation.title = match.title;
    }
    if (!entry.translation.pickup && match.desc) {
      entry.translation.pickup = '';
    }
    if (!hasManualBody(entry.translation)) {
      entry.translation.body = normalized.body;
    }

    entry.translation.searchAliases = mergeSearchAliases(entry.translation.searchAliases, [match.title, entry.source.title]);
    entry.translation.references = mergeSearchAliases(entry.translation.references, [
      'https://github.com/wofsauge/External-Item-Descriptions',
    ]);

    if (entry.status === 'pending') {
      entry.status = entry.translation.title || hasManualBody(entry.translation) ? 'translated' : 'pending';
    }

    importedCount += 1;
  }

  overlay.generatedAt = new Date().toISOString();
  overlay.statusSummary = {
    pending: overlay.entries.filter((entry) => entry.status === 'pending').length,
    translated: overlay.entries.filter((entry) => entry.status === 'translated').length,
    reviewed: overlay.entries.filter((entry) => entry.status === 'reviewed').length,
  };

  writeJson(overlayPath, overlay);

  console.log(
    JSON.stringify(
      {
        importedCount,
        statusSummary: overlay.statusSummary,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
