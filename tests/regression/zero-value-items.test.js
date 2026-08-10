import "../setup/foundry-mocks.js";
import test from "node:test";
import assert from "node:assert/strict";
import { CompendiumScanner } from "../../scripts/compendium-scanner.js";

const baseConfig = {
  compendiums: ["world.test-items"],
  itemLevelMin: 0,
  itemLevelMax: 25,
  rarity: "common",
  includeCombatGear: true,
  includeConsumables: true,
  includePermanentItems: true,
  preferredCategories: []
};

function installPack() {
  game.packs = [{
    documentName: "Item",
    collection: "world.test-items",
    metadata: { label: "Test Items" },
    getIndex: async () => [
      { _id: "normal-zero", name: "Worthless Pebble", type: "equipment", system: { level: { value: 1 }, traits: { rarity: "common", value: [] }, price: { value: { gp: 0 } } } },
      { _id: "cursed-zero", name: "Cursed Token", type: "equipment", system: { level: { value: 1 }, traits: { rarity: "common", value: ["cursed"] }, price: { value: { gp: 0 } } } },
      { _id: "normal-value", name: "Useful Tool", type: "equipment", system: { level: { value: 1 }, traits: { rarity: "common", value: [] }, price: { value: { gp: 2 } } } }
    ]
  }];
}

test("zero-GP items are excluded by default", async () => {
  installPack();
  const items = await CompendiumScanner.getMatchingItems({ ...baseConfig, allowCursedZeroValueItems: false });
  assert.deepEqual(items.map(item => item.name), ["Useful Tool"]);
});

test("only cursed zero-GP items are allowed when explicitly enabled", async () => {
  installPack();
  const items = await CompendiumScanner.getMatchingItems({ ...baseConfig, allowCursedZeroValueItems: true });
  assert.deepEqual(items.map(item => item.name), ["Cursed Token", "Useful Tool"]);
});
