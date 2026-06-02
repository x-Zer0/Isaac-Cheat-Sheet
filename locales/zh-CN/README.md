# zh-CN Overlay

This directory stores Simplified Chinese translation data for item entries.

## Source of Truth

- Base content: `../en-US/items.seed.json`
- Chinese overlay: `./items.overlay.json`

## Overlay Shape

Each overlay entry contains:

- `entryKey`
- `status`
- `source`
- `translation`

`source` contains stable reference data copied from the English seed to make editing easier.

The `source` snapshot intentionally includes the original English title, pickup text, body lines, quality, meta, tags, and aliases so translators do not need to cross-reference the seed file for routine edits.

`translation` contains only Chinese-side content:

- `title`
- `pickup`
- `body`
- `unlock`
- `meta`
- `searchAliases`
- `notes`
- `references`

## Status

- `pending`: no translation work yet
- `translated`: Chinese content exists but still needs review
- `reviewed`: checked against in-game / wiki / EID wording

## Editing Rule

Do not change `entryKey`, `tid`, `sid`, or `itemIdValue` in the overlay. Those fields are identity anchors for later rendering and source lookup.

## Tooling

- `scripts/bootstrap-zh-cn-overlay.js`: create or refresh the overlay scaffold from the English seed
- `scripts/import-eid-zh-cn.js`: import Chinese item names/descriptions from EID community sources without overwriting existing manual translations
- `scripts/validate-zh-cn-overlay.js`: validate key parity, schema shape, and status distribution
- `scripts/report-zh-cn-pending.js`: list untranslated entries, if any remain
