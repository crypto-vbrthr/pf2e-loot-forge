import "../setup/foundry-mocks.js";
import test from "node:test";
import assert from "node:assert/strict";
import { LootGenerator } from "../../scripts/loot-generator.js";
import { CompendiumScanner } from "../../scripts/compendium-scanner.js";
import { ItemFactory } from "../../scripts/item-factory.js";
import { ThemeManager } from "../../scripts/theme-manager.js";
import { TreasureProfileManager } from "../../scripts/treasure-profile-manager.js";

const theme = {
  id: "generic",
  name: "LF.Theme.Generic",
  weights: { permanent: 100 },
  tags: ["generic"]
};

const budgetProfile = {
  id: "test-budget",
  name: "Test Budget",
  budgetMultiplier: 1,
  budgetsGp: { "10": 100 },
  categoryWeights: { permanent: 100 }
};

test("wildly over-budget items are not selected when an affordable candidate exists", async () => {
  const originals = {
    getTheme: ThemeManager.getTheme,
    getActiveProfile: TreasureProfileManager.getActiveProfile,
    getMatchingItems: CompendiumScanner.getMatchingItems,
    hydrateItems: CompendiumScanner.hydrateItems,
    createGeneratedValuables: ItemFactory.createGeneratedValuables,
    createCoins: ItemFactory.createCoins,
    random: Math.random
  };

  try {
    ThemeManager.getTheme = async () => theme;
    TreasureProfileManager.getActiveProfile = async () => budgetProfile;
    CompendiumScanner.getMatchingItems = async () => [
      { uuid: "expensive", name: "Absurdly Expensive Item", type: "equipment", category: "permanent", priceGp: 60000, level: 20, rarity: "common" },
      { uuid: "affordable", name: "Affordable Item", type: "equipment", category: "permanent", priceGp: 80, level: 10, rarity: "common" }
    ];
    CompendiumScanner.hydrateItems = async selected => selected.map(item => ({ name: item.name, type: item.type }));
    ItemFactory.createGeneratedValuables = async () => [];
    ItemFactory.createCoins = () => ({ cp: 0, sp: 0, gp: 0, pp: 0 });
    Math.random = () => 0.5;

    const result = await LootGenerator.generate({
      level: 10,
      partySize: 4,
      theme: "generic",
      treasureProfile: "standard",
      rarity: "common",
      includePermanentItems: true,
      includeConsumables: false,
      includeValuables: false,
      includeCuriosities: false,
      compendiums: ["world.test-items"]
    });

    assert.ok(result.selectedRefs.some(item => item.name === "Affordable Item"));
    assert.ok(!result.selectedRefs.some(item => item.name === "Absurdly Expensive Item"));
  } finally {
    ThemeManager.getTheme = originals.getTheme;
    TreasureProfileManager.getActiveProfile = originals.getActiveProfile;
    CompendiumScanner.getMatchingItems = originals.getMatchingItems;
    CompendiumScanner.hydrateItems = originals.hydrateItems;
    ItemFactory.createGeneratedValuables = originals.createGeneratedValuables;
    ItemFactory.createCoins = originals.createCoins;
    Math.random = originals.random;
  }
});
