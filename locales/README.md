# Locale Seed Data

This directory stores structured localization seed data extracted from the legacy embedded HTML.

## Current Files
- `en-US/items.seed.json`: canonical English source extracted from `index.html`

## Entry Key

Each record contains an `entryKey` with this format:

```text
<family>:<sid>:<tid>:<variant>
```

Examples:
- `collectible:619:489:base`
- `collectible:619:489:tainted`
- `trinket:10129:804:base`
- `card:1:1:base`

## Why This Exists

The legacy page uses embedded `.textbox` blocks in HTML. Existing DOM attributes are not reliable enough to act as the sole localization key:

- `data-sid` is not unique
- `data-tid + data-sid` still has collisions in at least one known case

The extracted seed data becomes the stable content layer for future i18n work.

## Output Shape

Each entry record includes:

- `entryKey`
- `family`
- `section`
- `title`
- `titleSuffix`
- `tid`
- `sid`
- `cid`
- `itemIdLabel`
- `itemIdValue`
- `pickup`
- `quality`
- `body`
- `unlock`
- `meta`
- `tags`
- `searchAliases`

## Intended Next Step

Add `zh-CN/items.json` based on this seed and later update runtime rendering to use localized records instead of embedded English HTML.
