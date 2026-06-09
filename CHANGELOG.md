# Changelog

## 0.3.0b
- Added environment-specific condition pools
- Environmental conditions are merged into generated treasure condition selection
- Added coastal, underwater, volcanic, arctic, swamp, forest, jungle, desert, cave, mountain, underground, and ruined-city condition flavor
- No UI changes beyond v0.3.0a environment dropdown
- No budget or profile changes

## 0.3.0b
- Hotfix: defines `environmentOptions` in LootForgeApp context preparation
- Fixes crash when opening Loot Forge after v0.3.0a environment dropdown changes
- No loot logic changes

## 0.3.0a
- Added environment modifiers data file
- Added EnvironmentManager
- Environment field is now a localized dropdown
- Environment now influences generated treasure category weighting
- Coast, cave, forest, swamp, desert, underwater, arctic, underground, volcanic, jungle, mountains, and ruined city environments added
- No profile UI changes
- No Actor sidebar launcher changes

## 0.2.9
- Restored and expanded generated treasure variety
- Added larger generic pools for paintings and other treasure categories
- Added textiles, instruments, collectibles, and craftsmanship generated treasure categories
- Replaced deterministic category cycling with random category selection
- Improved generic theme picking so dragon paintings no longer dominate standard treasure
- Added quality tiers and flair descriptions for generated treasures
- No profile UI changes

## 0.2.8
- Restored budget-aware PF2E compendium item filtering
- Uses actual compendium item prices when available
- Prevents very expensive items from exceeding the item budget under standard profiles
- Filters 0-GP compendium items by default
- Adds optional setting to allow 0-GP cursed items
- No profile UI changes

## 0.2.7
- Layout recovery release
- Widened the generation column again
- Improved min/max item level field alignment
- Kept Actor sidebar launcher from the stable safe build
- No treasure profile changes
- No loot logic changes
- Intended as a stable UI baseline for a Git tag

## 0.2.6
- Safe rollback build from the last known functioning project base
- Restores valid Loot Forge app code
- Adds robust Actor sidebar launcher fallback only
- Profile UI patches from v0.2.3-v0.2.5 are intentionally not included

## 0.1.5
- Coins are now added only as actor currency, not as treasure items
- Removed duplicate coin treasure entries when applying loot
- Added option to mystify magical compendium items
- Magic item mystification is enabled by default
- Added world setting and UI checkbox for magic item mystification

## 0.1.4
- Reworked main layout into three columns
- Increased application window size
- Split generation, PF2E preview/coins, and generated treasures into separate columns
- Added independent scroll areas
- Added compact summary and compact generated treasure rows
- Kept action buttons visible in a bottom action bar
- Reduced vertical pressure in the preview editor

## 0.1.3
- Added editable loot preview workflow
- Coins can now be edited in the preview
- Generated treasure values can now be edited before applying loot
- Generated treasure entries can be rerolled individually by source type
- Generated treasure entries can be removed individually
- PF2E compendium items can be removed individually from the preview
- Preview total and budget delta are recalculated after edits

## 0.1.2
- Added procedural generated treasure architecture
- Added shared `ProceduralGenerator` base class
- Added category generators for paintings, statues, jewelry, beverages, documents, and curiosities
- Added `GeneratedTreasureFactory`
- Added data-driven generator component pools under `data/generators/`
- Replaced fixed generated treasure selection with template + component generation
- Generated treasure now stores `flags.pf2e-loot-forge.sourceType` for future single-item rerolls

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
