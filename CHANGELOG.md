# Changelog

## 0.0.6
- Reworked UI into tabbed layout
- Moved compendium selection into its own tab
- Main tab now shows generation and preview side by side
- Added vertical separator between generation and preview
- Target controls remain close to the preview workflow

## 0.0.5
- Added preview-first loot workflow
- Added separate apply-to-actor action
- Added create-new-loot-actor action
- Added support for selecting existing loot actors as targets
- Loot actors are sorted before other actors in the target dropdown
- Generation no longer automatically writes to actors
- Added estimated total value display

## 0.0.4
- Added internal fallback localization map
- Added `lf` Handlebars helper
- Replaced UI template `localize` calls with robust `lf` helper

## 0.0.3
- Moved launcher from Scene Controls to Actor Directory
- Added Actor Directory header button
- Added `addLootToActor(actor, loot)` API method

## 0.0.2
- Added ApplicationV2 UI scaffold
- Added settings registration
- Added compendium source selection
- Added first loot generator

## 0.0.1
- Initial scaffold
