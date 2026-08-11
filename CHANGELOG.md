# Changelog

## 0.3.4

- Remembers the standalone Loot Forge's last level, party size, minimum item level, and maximum item level per client.
- Also remembers fixed-budget mode and its value.
- Added optional fixed GP budget, overriding the automatically calculated target budget while preserving normal loot composition rules.
- Clarified that minimum/maximum item level restrict eligible item levels and do not alter treasure level or budget.
- Increased the standalone container size from 1240×860 to 1360×900.
- Embedded editors remain host-controlled by default and do not automatically use/persist standalone generation defaults.
- Added regression and contract tests for fixed budgets and persistence boundaries.

## 0.3.3e
- Test contract cleanup after the v0.3.3d price-source fix.
- Replaces the obsolete v0.3.3c `price-precision.test.js` expectation with the current source-boundary contract.
- Actor application is explicitly tested to avoid rewriting item source prices.
- Price serialization to whole PF2e coin denominations remains covered by `price-source-precision.test.js`.
- No runtime or generation logic changes.

## 0.3.3d
- Fixed empty loot actors caused by late price mutation during embedded item creation.
- Item Forge treasure sources now keep their original PF2e whole-coin price structure.
- Native generated treasures serialize decimal GP values to exact GP/SP/CP at source creation.
- The Loot Forge preview derives a decimal GP display value without mutating item data.
- Creating a loot actor now uses the editor's current editable loot state.
- No budget or treasure-selection logic changed.

## 0.3.3c

- Fixed fractional treasure prices being rounded when items are created on actors.
- Loot Forge preview values remain GP-based and unchanged.
- Fractional GP values are serialized into exact integer GP/SP/CP denominations only at the Foundry item-creation boundary (for example, 121.8 gp becomes 121 gp + 8 sp).
- No budget, generation, theme, environment, or Item Forge generation logic changes.

## 0.3.3b

- Fixed Foundry VTT compatibility metadata.
- Removed the hard `maximum` core version cap.
- Uses generation-wide Foundry VTT v14 verification.
- No runtime, generation, or Item Forge integration changes.

## 0.3.3a
- Extended the optional PF2E Item Forge provider to atmospheric/generated treasure
- When Item Forge delegation is enabled, individual art objects, valuables, curiosities, books/documents, jewelry, ceremonial objects, luxury goods, tableware, gemstones, and beverages can be built by Item Forge
- Loot Forge still owns overall budget, loot composition, coins, selected theme/environment, and actor persistence
- Loot Forge theme IDs are translated into Item Forge treasure styles/motifs and magic themes where supported
- Theme ID, theme tags, environment, caller, and Loot Forge category are passed as Item Forge metadata
- Item Forge treasure re-rolls remain delegated to Item Forge and preserve their treasure category/theme context
- Added treasure capability detection with safe fallback for older Item Forge APIs
- Added integration tests for theme transfer, treasure delegation, and delegated re-rolls
- Test suite: 43 tests

## 0.3.3
- Added optional PF2E Item Forge integration for rule-relevant PF2e item generation
- Added per-request `Use Item Forge for PF2e items` control, disabled automatically when Item Forge is unavailable
- Added world default setting for Item Forge delegation
- Loot Forge still owns budgets, themes, environments, coins, atmospheric generated treasure, and persistence
- Item Forge receives Loot Forge level range, rarity ceiling, selected compendiums, and theme/environment caller metadata
- Returned Item Forge items are still subject to Loot Forge's hard budget cap and zero-GP filtering rules
- Native Loot Forge compendium selection remains unchanged when Item Forge delegation is disabled
- Added public `getItemForgeIntegrationStatus()` API helper
- Added integration regression tests; full suite now covers optional provider delegation

## 0.3.2a
- Test harness hotfix: regression tests import the Foundry mocks directly
- Tests now run correctly both through `npm test` and IDE Node test runners such as WebStorm
- Removed dependency on the package-level `--import` preload for the test suite
- No runtime or loot generation logic changes


## 0.3.2
- Added a reusable Embedded Loot Forge editor contract for other Foundry modules
- Moved Apply to Actor and Create Loot Actor actions into the standalone host container
- Added `game.modules.get("pf2e-loot-forge").api.createEmbeddedEditor()`
- Added versioned embedded contract with config/state/loot/generate/destroy methods
- Preserved standalone Actor and Token drag & drop target selection
- Added automated contract, localization, JSON data, zero-value item, and budget-cap regression tests
- Added zero-dependency Node.js test runner via `npm test`
- Generation engine and generator data are unchanged in this release

## 0.3.1b
- Hotfix: rebuilt target actor drag & drop from stable v0.3.0g base
- Added actor/sidebar and scene token drop support without private helper methods
- Fixes private field syntax error from v0.3.1
- No loot logic changes

## 0.3.0g
- Localization cleanup for all `LF.Generated.Theme.*` keys found in data and scripts
- Added missing localization for `ShipName` and related theme details
- Added fallback localization generation for future theme keys
- No loot logic changes

## 0.3.0f
- Hotfix: added missing localization for `LF.Generated.Theme.BattleNotches`
- Added a few related instrument detail localization fallbacks
- No loot logic changes

## 0.3.0e
- Hotfix: guarantees `combinedCategoryWeights` is defined in item-factory
- Fixes crash during generated treasure creation
- Keeps v0.3.0c theme identity and v0.3.0d environment dropdown
- No content or UI changes beyond the crash fix

## 0.3.0d
- Hotfix: restored Environment as localized dropdown
- Ensures `environmentOptions` is available in LootForgeApp context
- Keeps v0.3.0c theme identity changes
- No loot logic changes

## 0.3.0c
- Added stronger theme identity for generated treasures
- Added `data/theme-modifiers.json`
- Added theme category weighting via ThemeIdentityManager
- Category selection now combines theme identity and environment weighting
- Expanded theme-specific content pools for dragon hoards, dwarven ruins, pirate hideouts, temples, wizard towers, alchemists, cultists, undead, bandits, and goblins
- Added many localized theme-specific motifs, documents, curiosities, collectibles, and craftsmanship details
- No profile UI changes
- No Actor sidebar launcher changes

## 0.1.9
- Added editable treasure budget profiles
- Added Treasure Profile settings menu
- Added active treasure profile world setting
- Added PF2E Standard, Low Magic, and High Magic budget profile data
- Budget calculation now uses active treasure profile
- Added 0-GP item filtering for compendium items
- Added optional exception for cursed 0-GP items
- Added profile editor template and styles

## 0.1.8
- Widened the generation column to reduce field wrapping
- Shortened min/max item level labels
- Added PF2E compendium item price extraction
- Added budget-aware item selection
- Added treasure-profile based budget tolerance
- Prevented extremely expensive high-level items from being selected for standard budgets
- Estimated total value now uses actual compendium item prices when available

## 0.1.7
- Expanded generated treasure component pools
- Added new generated treasure categories: textiles, instruments, collectibles, and craftsmanship
- Added quality tiers for generated treasures
- Added flair description lines for generated treasures
- Improved generic theme variety to avoid repeated dragon paintings
- Improved themed component selection with stronger theme weighting and generic fallback
- Added richer generated treasure metadata flags

## 0.1.6
- Fixed visibility of the mystify magic items option in the main Loot Forge UI
- Ensured mystify magic items remains registered as a world setting
- Fixed compendium tab scrolling so the final entries are reachable
- Added Select All and Deselect All controls for compendium sources
- Improved compendium panel flex layout

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
