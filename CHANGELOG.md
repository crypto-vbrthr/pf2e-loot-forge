# Changelog

## 0.1.1
- Fixed form state reset after generating loot
- Rarity selection now persists after render
- Treasure profile selection now persists after render
- Theme, loot style, checkboxes, and item level range now use the preserved render config more consistently
- Added selected option data for dropdown rendering

## 0.1.0
- Added larger generated treasure libraries
- Added paintings, statues, jewelry, beverages, curiosities, and documents as data pools
- Added atmospheric/practical loot style slider
- Loot style now shifts budget toward PF2E items or generated treasures
- Generated treasures are now selected from external JSON data
- Added `GeneratedLibrary`
- Stabilized `generateInventoryForCreature()` return structure for Monster Forge

## 0.0.9
- Item level range now automatically updates when the level field changes
- Default range is level -2 through level +1
- Added localized item type labels in preview
- `consumable` now displays as `Verbrauchsgegenstand` in German
- Added dynamic localization helper `lfKey`

## 0.0.8
- Added treasure budget foundation by level, party size, and treasure profile
- Added budget split by theme weights
- Coin generation now follows the theme budget split
- Generated valuables and curiosities now use budget categories
- PF2E item selection now tries to stay near item budget
- Preview now shows target budget, estimated total value, and delta
- Added `TreasureBudget` helper and data table

## 0.0.7
- Added theme profile system
- Added weighted loot categories per theme
- Added localized theme dropdown
- Added first 14 loot themes
- Added themed valuables and curiosities
- Added `ThemeManager` for theme loading and creature-trait inference
- Added `generateInventoryForCreature(creatureData)` API method for Monster Forge
- Improved `generateLootForCreature(creatureData)` to infer themes from traits

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
