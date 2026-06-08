# PF2E Loot Forge

PF2E Loot Forge is a Foundry VTT module for generating Pathfinder 2e loot.

## v0.1.5

- Actor Directory button
- ApplicationV2 loot generator window
- Loot preview workflow
- Regenerate without immediately applying loot
- Apply preview to an existing actor
- Create a new PF2E loot actor and fill it with the preview
- Loot actors are listed and sorted before other actors
- Tabbed UI with compendium source settings in a separate tab
- Compendium scanner for real PF2E Item documents
- Generic art objects and curiosities as treasure items
- Localized sentence-template foundation
- Public API for Monster Forge integration


## Monster Forge Integration Draft

Loot Forge now exposes two creature-focused API methods:

```js
const lootApi = game.modules.get("pf2e-loot-forge")?.api;

const loot = await lootApi.generateLootForCreature({
  level: 5,
  traits: ["goblin", "humanoid"],
  role: "skirmisher",
  environment: "cave",
  treasureProfile: "standard"
});

const inventory = await lootApi.generateInventoryForCreature({
  level: 5,
  traits: ["goblin", "humanoid"],
  role: "skirmisher",
  includeCombatGear: true
});
```


## v0.1.5 Budget Note

This version introduces a first playable treasure budget foundation. The numbers are intentionally isolated in:

```text
data/templates/treasure-budgets.json
```

so they can be adjusted later without rewriting generator logic.

## v0.1.5 Notes

Changing the loot level now automatically adjusts min/max item level to `level - 2` and `level + 1`.

## v0.1.5

This release expands generated treasure variety and adds a loot style slider for atmospheric vs practical treasure generation.

## v0.1.5

Fixes form state preservation after generating loot.


## v0.1.5 Procedural Treasure Architecture

Generated treasures now use the architecture:

```text
scripts/generated/
data/generators/
```

Generated treasure is built from templates and localized components instead of fixed object lists.

## v0.1.5 Treasure Editor

The loot preview can now be edited before applying it to an actor or creating a loot actor.

## v0.1.5 Layout

The main interface now uses a wider three-column layout with independent scroll areas.

## v0.1.5

Coins are now written only to actor currency. Magical items can be mystified by default.

## v0.2.7 Layout Recovery

Wider generation column and safer field alignment. No profile or loot logic changes.
