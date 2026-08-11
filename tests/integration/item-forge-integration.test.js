import "../setup/foundry-mocks.js";
import test from "node:test";
import assert from "node:assert/strict";
import { ItemForgeIntegration, ITEM_FORGE_MODULE_ID } from "../../scripts/item-forge-integration.js";
import { LootGenerator } from "../../scripts/loot-generator.js";
import { CompendiumScanner } from "../../scripts/compendium-scanner.js";
import { ItemFactory } from "../../scripts/item-factory.js";
import { ThemeManager } from "../../scripts/theme-manager.js";
import { TreasureProfileManager } from "../../scripts/treasure-profile-manager.js";

function source({ name = "Forge Item", price = 40, level = 5, type = "equipment", rarity = "common", generated = true } = {}) {
  return {
    name,
    type,
    img: "icons/svg/item-bag.svg",
    system: {
      level: { value: level },
      price: { value: { gp: price } },
      traits: { rarity, value: generated ? ["magical"] : [] }
    },
    flags: {
      [ITEM_FORGE_MODULE_ID]: { generated }
    }
  };
}

function installFakeApi(generate, { treasure = true } = {}) {
  const api = {
    apiVersion: 1,
    generate,
    getCapabilities: () => ({
      generationModes: treasure ? ["existing", "equipment", "magic", "treasure"] : ["existing", "equipment", "magic"],
      categories: treasure ? ["item", "treasure"] : ["item"]
    })
  };
  game.pf2eItemForge = api;
  game.modules.set(ITEM_FORGE_MODULE_ID, { id: ITEM_FORGE_MODULE_ID, active: true, api });
  return api;
}

function uninstallFakeApi() {
  delete game.pf2eItemForge;
  game.modules.delete(ITEM_FORGE_MODULE_ID);
}

test("integration status is optional and detects an active Item Forge API", () => {
  uninstallFakeApi();
  assert.equal(ItemForgeIntegration.getStatus().available, false);
  installFakeApi(async () => ({ itemSource: source() }));
  const status = ItemForgeIntegration.getStatus();
  assert.equal(status.installed, true);
  assert.equal(status.active, true);
  assert.equal(status.available, true);
  assert.equal(status.apiVersion, 1);
  uninstallFakeApi();
});

test("delegated requests honor Loot Forge level, rarity, compendium and caller metadata", async () => {
  let captured = null;
  installFakeApi(async request => {
    captured = request;
    return {
      request,
      itemSource: source({ price: 25, level: 6 }),
      metadata: { generator: "fake", level: 6, rarity: "common" }
    };
  });

  const result = await ItemForgeIntegration.generateItems({
    level: 6,
    itemLevelMin: 4,
    itemLevelMax: 7,
    rarity: "rare",
    theme: "wizard",
    themeProfile: { id: "wizard" },
    environment: "cave",
    includeCombatGear: false,
    includeConsumables: false,
    includePermanentItems: true,
    allowCursedZeroValueItems: false,
    preferredCategories: ["permanent"],
    budgetSplit: { permanent: 100, magic: 100 },
    compendiums: ["pf2e.equipment-srd", "world.custom"]
  }, { itemBudget: 100, maxItems: 1, tolerance: 1.2 });

  assert.equal(result.pf2eItems.length, 1);
  assert.equal(result.selectedRefs[0].provider, "item-forge");
  assert.deepEqual(captured.level, { min: 4, max: 7, target: 6 });
  assert.equal(captured.levelPolicy, "strict");
  assert.deepEqual(captured.rarity, ["common", "uncommon", "rare"]);
  assert.deepEqual(captured.source, {
    mode: "selected",
    includePacks: ["pf2e.equipment-srd", "world.custom"],
    excludePacks: []
  });
  assert.equal(captured.metadata.caller, "pf2e-loot-forge");
  if (captured.mode === "magic") assert.equal(captured.magic.theme, "arcane");
  uninstallFakeApi();
});

test("delegated treasure generation passes Loot Forge theme and environment into Item Forge", async () => {
  let captured = null;
  installFakeApi(async request => {
    captured = request;
    return {
      request,
      itemSource: {
        name: "Themed Pirate Treasure",
        type: "treasure",
        img: "systems/pf2e/icons/default-icons/treasure.svg",
        system: {
          level: { value: 0 },
          price: { value: { gp: 40, sp: 5 } },
          traits: { rarity: "common", value: [] }
        },
        flags: { [ITEM_FORGE_MODULE_ID]: { generated: true } }
      },
      metadata: { generator: "treasure-generated", value: 40.5, category: request.category }
    };
  });

  const result = await ItemForgeIntegration.generateTreasures({
    level: 6,
    theme: "pirate",
    themeProfile: { id: "pirate", tags: ["pirate", "sea"], weights: { valuables: 20, beverages: 20 } },
    environment: "coast",
    includeValuables: true,
    includeCuriosities: false,
    budgetSplit: { valuables: 100, beverages: 25 }
  }, { treasureBudget: 125, maxTreasures: 1, tolerance: 1.2 });

  assert.equal(result.generatedItems.length, 1);
  assert.equal(captured.mode, "treasure");
  assert.equal(captured.treasure.style, "core.style.nautical");
  assert.equal(captured.metadata.theme, "pirate");
  assert.equal(captured.metadata.environment, "coast");
  assert.equal(captured.metadata.itemForgeTreasureMotif, "core.motif.maritime");
  assert.deepEqual(captured.metadata.themeTags, ["pirate", "sea"]);
  assert.deepEqual(result.generatedItems[0].system.price.value, { gp: 40, sp: 5 });
  assert.equal(result.generatedItems[0].flags["pf2e-loot-forge"].valueGp, 40.5);
  assert.equal(result.generatedItems[0].flags["pf2e-loot-forge"].provider, "item-forge");
  uninstallFakeApi();
});

test("delegated treasure re-roll preserves Item Forge category and theme context", async () => {
  let captured = null;
  installFakeApi(async request => {
    captured = request;
    return {
      request,
      itemSource: {
        name: "Reforged Temple Treasure",
        type: "treasure",
        system: { price: { value: { gp: 30 } }, traits: { rarity: "common", value: [] } },
        flags: { [ITEM_FORGE_MODULE_ID]: { generated: true } }
      },
      metadata: { generator: "treasure-generated", value: 30 }
    };
  });

  const item = {
    name: "Old Treasure",
    type: "treasure",
    system: { price: { value: { gp: 25 } } },
    flags: {
      "pf2e-loot-forge": {
        sourceType: "item-forge-treasure",
        itemForge: { category: "treasure.ceremonial", group: "religious" }
      }
    }
  };

  const replacement = await ItemForgeIntegration.regenerateTreasure({
    theme: "temple",
    themeProfile: { id: "temple", tags: ["temple"], weights: {} },
    environment: "cave"
  }, item, { targetValue: 25 });

  assert.equal(replacement.name, "Reforged Temple Treasure");
  assert.equal(captured.mode, "treasure");
  assert.equal(captured.category, "treasure.ceremonial");
  assert.equal(captured.treasure.style, "core.style.temple");
  assert.equal(captured.metadata.theme, "temple");
  uninstallFakeApi();
});

test("delegated generation keeps Loot Forge's hard budget cap", async () => {
  installFakeApi(async request => ({
    request,
    itemSource: source({ name: "Absurdly Expensive Forge Item", price: 60000, level: 20 }),
    metadata: { generator: "fake", level: 20, rarity: "common" }
  }));

  const result = await ItemForgeIntegration.generateItems({
    level: 10,
    itemLevelMin: 8,
    itemLevelMax: 12,
    rarity: "common",
    theme: "generic",
    includeCombatGear: false,
    includeConsumables: false,
    includePermanentItems: true,
    allowCursedZeroValueItems: false,
    preferredCategories: ["permanent"],
    budgetSplit: { permanent: 100 },
    compendiums: ["pf2e.equipment-srd"]
  }, { itemBudget: 100, maxItems: 2, tolerance: 1.2 });

  assert.equal(result.pf2eItems.length, 0);
  assert.equal(result.selectedRefs.length, 0);
  assert.ok(result.attempts > 0);
  uninstallFakeApi();
});

test("LootGenerator delegates PF2e item production when Item Forge is selected", async () => {
  const originals = {
    getTheme: ThemeManager.getTheme,
    getActiveProfile: TreasureProfileManager.getActiveProfile,
    getMatchingItems: CompendiumScanner.getMatchingItems,
    createGeneratedValuables: ItemFactory.createGeneratedValuables,
    createCoins: ItemFactory.createCoins,
    generateItems: ItemForgeIntegration.generateItems,
    generateTreasures: ItemForgeIntegration.generateTreasures
  };

  try {
    installFakeApi(async () => ({ itemSource: source() }));
    ThemeManager.getTheme = async () => ({ id: "generic", name: "LF.Theme.Generic", weights: { permanent: 100 }, tags: [] });
    TreasureProfileManager.getActiveProfile = async () => ({
      id: "test",
      name: "Test",
      budgetMultiplier: 1,
      budgetsGp: { "5": 100 },
      categoryWeights: { permanent: 100 }
    });
    CompendiumScanner.getMatchingItems = async () => { throw new Error("native scanner must not be used"); };
    ItemFactory.createGeneratedValuables = async () => [];
    ItemFactory.createCoins = () => ({ cp: 0, sp: 0, gp: 0, pp: 0 });
    ItemForgeIntegration.generateItems = async () => ({
      available: true,
      attempts: 2,
      warnings: [],
      pf2eItems: [source({ name: "Delegated", price: 40 })],
      selectedRefs: [{ name: "Delegated", type: "equipment", typeLabelKey: "LF.ItemType.Equipment", category: "permanent", priceGp: 40, level: 5, rarity: "common", provider: "item-forge" }]
    });

    const result = await LootGenerator.generate({
      level: 5,
      itemLevelMin: 3,
      itemLevelMax: 6,
      rarity: "common",
      theme: "generic",
      treasureProfile: "standard",
      includeCombatGear: false,
      includeConsumables: false,
      includePermanentItems: true,
      includeValuables: false,
      includeCuriosities: false,
      useItemForge: true,
      compendiums: ["pf2e.equipment-srd"]
    });

    assert.equal(result.pf2eItems[0].name, "Delegated");
    assert.equal(result.summary.itemProvider, "item-forge");
    assert.equal(result.summary.candidates, 1);
    assert.equal(result.summary.itemForgeAttempts, 2);
  } finally {
    ThemeManager.getTheme = originals.getTheme;
    TreasureProfileManager.getActiveProfile = originals.getActiveProfile;
    CompendiumScanner.getMatchingItems = originals.getMatchingItems;
    ItemFactory.createGeneratedValuables = originals.createGeneratedValuables;
    ItemFactory.createCoins = originals.createCoins;
    ItemForgeIntegration.generateItems = originals.generateItems;
    ItemForgeIntegration.generateTreasures = originals.generateTreasures;
    uninstallFakeApi();
  }
});

test("LootGenerator delegates atmospheric treasure production when Item Forge is selected", async () => {
  const originals = {
    getTheme: ThemeManager.getTheme,
    getActiveProfile: TreasureProfileManager.getActiveProfile,
    getMatchingItems: CompendiumScanner.getMatchingItems,
    createGeneratedValuables: ItemFactory.createGeneratedValuables,
    createCoins: ItemFactory.createCoins,
    generateItems: ItemForgeIntegration.generateItems,
    generateTreasures: ItemForgeIntegration.generateTreasures
  };

  try {
    installFakeApi(async () => ({ itemSource: source() }));
    ThemeManager.getTheme = async () => ({ id: "dragon-hoard", name: "Dragon", weights: { valuables: 100 }, tags: ["dragon", "hoard"] });
    TreasureProfileManager.getActiveProfile = async () => ({
      id: "test", name: "Test", budgetMultiplier: 1, budgetsGp: { "5": 100 }, categoryWeights: { valuables: 100 }
    });
    CompendiumScanner.getMatchingItems = async () => { throw new Error("native scanner must not be used"); };
    ItemFactory.createGeneratedValuables = async () => { throw new Error("native treasure generator must not be used"); };
    ItemFactory.createCoins = () => ({ cp: 0, sp: 0, gp: 0, pp: 0 });
    ItemForgeIntegration.generateItems = async () => ({ available: true, attempts: 0, warnings: [], pf2eItems: [], selectedRefs: [] });
    ItemForgeIntegration.generateTreasures = async () => ({
      available: true, attempts: 3, warnings: [],
      generatedItems: [{ name: "Delegated Dragon Hoard Treasure", type: "treasure", system: { price: { value: { gp: 55 } } } }]
    });

    const result = await LootGenerator.generate({
      level: 5,
      theme: "dragon-hoard",
      treasureProfile: "standard",
      includeCombatGear: false,
      includeConsumables: false,
      includePermanentItems: false,
      includeValuables: true,
      includeCuriosities: false,
      useItemForge: true,
      compendiums: ["pf2e.equipment-srd"]
    });

    assert.equal(result.generatedItems[0].name, "Delegated Dragon Hoard Treasure");
    assert.equal(result.summary.treasureProvider, "item-forge");
    assert.equal(result.summary.itemForgeTreasureAttempts, 3);
  } finally {
    ThemeManager.getTheme = originals.getTheme;
    TreasureProfileManager.getActiveProfile = originals.getActiveProfile;
    CompendiumScanner.getMatchingItems = originals.getMatchingItems;
    ItemFactory.createGeneratedValuables = originals.createGeneratedValuables;
    ItemFactory.createCoins = originals.createCoins;
    ItemForgeIntegration.generateItems = originals.generateItems;
    ItemForgeIntegration.generateTreasures = originals.generateTreasures;
    uninstallFakeApi();
  }
});

test("LootGenerator preserves native scanner behavior when Item Forge is not selected", async () => {
  const originals = {
    getTheme: ThemeManager.getTheme,
    getActiveProfile: TreasureProfileManager.getActiveProfile,
    getMatchingItems: CompendiumScanner.getMatchingItems,
    hydrateItems: CompendiumScanner.hydrateItems,
    createGeneratedValuables: ItemFactory.createGeneratedValuables,
    createCoins: ItemFactory.createCoins
  };

  try {
    uninstallFakeApi();
    ThemeManager.getTheme = async () => ({ id: "generic", name: "LF.Theme.Generic", weights: { permanent: 100 }, tags: [] });
    TreasureProfileManager.getActiveProfile = async () => ({ id: "test", name: "Test", budgetMultiplier: 1, budgetsGp: { "5": 100 }, categoryWeights: { permanent: 100 } });
    CompendiumScanner.getMatchingItems = async () => [{ uuid: "native", name: "Native", type: "equipment", category: "permanent", priceGp: 40, level: 5, rarity: "common" }];
    CompendiumScanner.hydrateItems = async refs => refs.map(ref => ({ name: ref.name, type: ref.type }));
    ItemFactory.createGeneratedValuables = async () => [];
    ItemFactory.createCoins = () => ({ cp: 0, sp: 0, gp: 0, pp: 0 });

    const result = await LootGenerator.generate({
      level: 5,
      itemLevelMin: 3,
      itemLevelMax: 6,
      rarity: "common",
      theme: "generic",
      treasureProfile: "standard",
      includeCombatGear: false,
      includeConsumables: false,
      includePermanentItems: true,
      includeValuables: false,
      includeCuriosities: false,
      useItemForge: false,
      compendiums: ["world.native"]
    });

    assert.equal(result.pf2eItems[0].name, "Native");
    assert.equal(result.summary.itemProvider, "loot-forge");
  } finally {
    ThemeManager.getTheme = originals.getTheme;
    TreasureProfileManager.getActiveProfile = originals.getActiveProfile;
    CompendiumScanner.getMatchingItems = originals.getMatchingItems;
    CompendiumScanner.hydrateItems = originals.hydrateItems;
    ItemFactory.createGeneratedValuables = originals.createGeneratedValuables;
    ItemFactory.createCoins = originals.createCoins;
  }
});
