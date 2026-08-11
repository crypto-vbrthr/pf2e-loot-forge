import { LOOT_CATEGORIES, MODULE_ID } from "./constants.js";
import { CompendiumScanner } from "./compendium-scanner.js";
import { ItemFactory } from "./item-factory.js";
import { ItemForgeIntegration } from "./item-forge-integration.js";
import { ThemeManager } from "./theme-manager.js";
import { TreasureBudget } from "./treasure-budget.js";
import { TreasureProfileManager } from "./treasure-profile-manager.js";
import { weightedPick } from "./weighted-picker.js";

export class LootGenerator {
  static async generate(options = {}) {
    const config = await this.#normalizeOptions(options);
    let candidates = [];
    let selectedRefs = [];
    let pf2eItems = [];
    let itemProvider = "loot-forge";
    let treasureProvider = "loot-forge";
    let itemForgeWarnings = [];
    let itemForgeTreasureWarnings = [];
    let itemForgeTreasureAttempts = 0;
    let generatedItems = [];
    const itemForgeStatus = ItemForgeIntegration.getStatus();

    if (config.useItemForge && itemForgeStatus.available) {
      const delegated = await ItemForgeIntegration.generateItems(config, {
        itemBudget: this.#itemBudget(config),
        maxItems: this.#maxItems(config),
        tolerance: this.#budgetTolerance(config)
      });
      selectedRefs = delegated.selectedRefs ?? [];
      pf2eItems = delegated.pf2eItems ?? [];
      itemForgeWarnings = delegated.warnings ?? [];
      itemProvider = "item-forge";
      candidates = Array.from({ length: Number(delegated.attempts ?? 0) }, () => null);

      if (itemForgeStatus.treasureAvailable) {
        const delegatedTreasure = await ItemForgeIntegration.generateTreasures(config, {
          treasureBudget: this.#treasureBudget(config),
          maxTreasures: this.#maxTreasures(config),
          tolerance: this.#budgetTolerance(config)
        });
        generatedItems = delegatedTreasure.generatedItems ?? [];
        itemForgeTreasureWarnings = delegatedTreasure.warnings ?? [];
        itemForgeTreasureAttempts = Number(delegatedTreasure.attempts ?? 0);
        treasureProvider = "item-forge";
      } else {
        generatedItems = await ItemFactory.createGeneratedValuables(config);
        treasureProvider = "loot-forge-fallback";
        itemForgeTreasureWarnings = [{ code: "ITEM_FORGE_TREASURE_UNAVAILABLE" }];
      }
    } else {
      candidates = await CompendiumScanner.getMatchingItems(config);
      selectedRefs = this.#pickItems(candidates, config);
      pf2eItems = await CompendiumScanner.hydrateItems(selectedRefs);
      generatedItems = await ItemFactory.createGeneratedValuables(config);
      if (config.useItemForge) {
        itemProvider = "loot-forge-fallback";
        treasureProvider = "loot-forge-fallback";
      }
    }

    const coins = ItemFactory.createCoins(config);
    const totalValueGp = this.#estimateTotalValueGp(coins, generatedItems, selectedRefs);

    return {
      coins,
      pf2eItems,
      generatedItems,
      selectedRefs,
      totalValueGp,
      budget: config.budget,
      budgetSplit: config.budgetSplit,
      budgetDeltaGp: Math.round((totalValueGp - config.budget.targetGp) * 100) / 100,
      themeProfile: config.themeProfile,
      summary: {
        level: config.level,
        theme: config.themeProfile?.id ?? config.theme,
        environment: config.environment,
        treasureProfile: config.treasureProfile,
        candidates: itemProvider === "item-forge" ? selectedRefs.length : candidates.length,
        itemProvider,
        treasureProvider,
        itemForgeAttempts: itemProvider === "item-forge" ? candidates.length : 0,
        itemForgeWarnings,
        itemForgeTreasureAttempts,
        itemForgeTreasureWarnings
      }
    };
  }

  static async #normalizeOptions(options) {
    const level = Number(options.level ?? 1);
    const themeProfile = options.themeProfile ?? await ThemeManager.getTheme(options.theme ?? "generic");
    const treasureBudgetProfile = await TreasureProfileManager.getActiveProfile();
    const budget = await TreasureBudget.calculate({ ...options, level, treasureBudgetProfile });
    let budgetSplit = TreasureBudget.splitBudget(budget.targetGp, themeProfile, treasureBudgetProfile);
    budgetSplit = this.#applyLootStyleToBudget(budgetSplit, Number(options.lootStyle ?? 50));
    const preferredCategories = this.#categoriesFromTheme(themeProfile, options);

    return {
      level,
      partySize: Number(options.partySize ?? 4),
      lootType: options.lootType ?? "encounter",
      lootTarget: options.lootTarget ?? "display",
      treasureProfile: options.treasureProfile ?? "standard",
      theme: themeProfile.id,
      themeProfile,
      lootStyle: Number(options.lootStyle ?? 50),
      budget,
      budgetSplit,
      preferredCategories,
      environment: options.environment ?? "generic",
      rarity: options.rarity ?? game.settings.get(MODULE_ID, "defaultRarity"),
      itemLevelMin: Number(options.itemLevelMin ?? Math.max(0, level - 2)),
      itemLevelMax: Number(options.itemLevelMax ?? level + 1),
      lootStyle: Number(options.lootStyle ?? 50),
      includeCombatGear: Boolean(options.includeCombatGear ?? false),
      includeConsumables: Boolean(options.includeConsumables ?? true),
      includePermanentItems: Boolean(options.includePermanentItems ?? true),
      includeValuables: Boolean(options.includeValuables ?? game.settings.get(MODULE_ID, "includeGeneratedValuables")),
      includeCuriosities: Boolean(options.includeCuriosities ?? true),
      compendiums: options.compendiums ?? game.settings.get(MODULE_ID, "enabledCompendiums"),
      allowCursedZeroValueItems: Boolean(options.allowCursedZeroValueItems ?? game.settings.get(MODULE_ID, "allowCursedZeroValueItems")),
      useItemForge: Boolean(options.useItemForge ?? game.settings.get(MODULE_ID, "useItemForgeByDefault"))
    };
  }

  static #applyLootStyleToBudget(split, lootStyle) {
    const next = { ...split };
    const practicalBoost = Math.max(0, (lootStyle - 50) / 50);
    const atmosphericBoost = Math.max(0, (50 - lootStyle) / 50);

    for (const key of ["weapons", "armor", "consumables", "permanent", "magic", "alchemy"]) {
      if (next[key]) next[key] = Math.round(next[key] * (1 + practicalBoost) * 100) / 100;
    }

    for (const key of ["art", "valuables", "curiosities", "documents", "religious"]) {
      if (next[key]) next[key] = Math.round(next[key] * (1 + atmosphericBoost) * 100) / 100;
    }

    return next;
  }

  static #categoriesFromTheme(themeProfile, options) {
    const categories = new Set();
    const weights = themeProfile?.weights ?? {};
    const attempts = options.treasureProfile === "hoard" ? 6 : options.treasureProfile === "boss" ? 4 : 3;

    for (let i = 0; i < attempts; i++) {
      const picked = weightedPick(weights);
      if (picked) categories.add(picked);
    }

    const pf2eCategoryMap = {
      weapons: LOOT_CATEGORIES.WEAPONS,
      armor: LOOT_CATEGORIES.ARMOR,
      consumables: LOOT_CATEGORIES.CONSUMABLES,
      permanent: LOOT_CATEGORIES.PERMANENT,
      magic: LOOT_CATEGORIES.PERMANENT,
      alchemy: LOOT_CATEGORIES.CONSUMABLES,
      valuables: LOOT_CATEGORIES.VALUABLES
    };

    return [...categories].map(category => pf2eCategoryMap[category]).filter(Boolean);
  }

  static #pickItems(items, config) {
    if (!items.length) return [];

    const itemBudget = this.#itemBudget(config);
    const maxItems = this.#maxItems(config);
    const tolerance = this.#budgetTolerance(config);
    const hardCap = Math.max(1, itemBudget * tolerance);

    const affordable = items.filter(item => {
      const value = this.#roughItemValue(item);
      return value <= hardCap;
    });

    const pool = affordable.length ? affordable : items.filter(item => this.#roughItemValue(item) <= hardCap * 2);
    const shuffled = foundry.utils.deepClone(pool.length ? pool : items)
      .sort(() => Math.random() - 0.5);

    const selected = [];
    let remaining = Math.max(1, itemBudget);

    for (const item of shuffled) {
      const value = this.#roughItemValue(item);

      if (selected.length > 0 && value > remaining * tolerance) continue;
      if (selected.length === 0 && value > itemBudget * tolerance) continue;

      selected.push(item);
      remaining -= value;

      if (remaining <= itemBudget * 0.15) break;
      if (selected.length >= maxItems) break;
    }

    if (selected.length) return selected;

    const fallback = shuffled
      .sort((a, b) => this.#roughItemValue(a) - this.#roughItemValue(b))
      .find(item => this.#roughItemValue(item) <= hardCap);

    return fallback ? [fallback] : [];
  }

  static #budgetTolerance(config) {
    return {
      poor: 1.05,
      standard: 1.2,
      rich: 1.35,
      boss: 1.5,
      hoard: 2
    }[config.treasureProfile] ?? 1.2;
  }

  static #itemBudget(config) {
    const split = config.budgetSplit ?? {};
    const budget = Number(split.weapons ?? 0)
      + Number(split.armor ?? 0)
      + Number(split.consumables ?? 0)
      + Number(split.permanent ?? 0)
      + Number(split.magic ?? 0)
      + Number(split.alchemy ?? 0);

    return Math.max(1, budget);
  }

  static #maxItems(config) {
    return { poor: 1, standard: 2, rich: 3, boss: 4, hoard: 6 }[config.treasureProfile] ?? 2;
  }

  static #treasureBudget(config) {
    const split = config.budgetSplit ?? {};
    const budget = Number(split.art ?? 0)
      + Number(split.valuables ?? 0)
      + Number(split.religious ?? 0)
      + Number(split.curiosities ?? 0)
      + Number(split.documents ?? 0)
      + Number(split.beverages ?? 0);
    return Math.max(0, budget);
  }

  static #maxTreasures(config) {
    const style = Number(config.lootStyle ?? 50);
    const perGroup = style <= 25 ? 3 : style <= 60 ? 2 : 1;
    return (config.includeValuables ? perGroup : 0) + (config.includeCuriosities ? perGroup : 0);
  }

  static #roughItemValue(item) {
    const priceGp = Number(item.priceGp ?? 0);
    if (priceGp > 0) return priceGp;

    const level = Number(item.level ?? 0);
    if (level <= 0) return 1;
    return Math.max(1, Math.round(Math.pow(level + 1, 2) * 0.75));
  }

  static #estimateTotalValueGp(coins, generatedItems, selectedRefs = []) {
    const coinGp = (coins.gp ?? 0) + ((coins.sp ?? 0) / 10) + ((coins.cp ?? 0) / 100) + ((coins.pp ?? 0) * 10);
    const generatedGp = generatedItems.reduce((sum, item) => {
      const price = item.system?.price?.value ?? {};
      return sum + Number(price.gp ?? 0) + Number(price.sp ?? 0) / 10 + Number(price.cp ?? 0) / 100 + Number(price.pp ?? 0) * 10;
    }, 0);
    const roughItemsGp = selectedRefs.reduce((sum, item) => sum + this.#roughItemValue(item), 0);
    return Math.round((coinGp + generatedGp + roughItemsGp) * 100) / 100;
  }
}
