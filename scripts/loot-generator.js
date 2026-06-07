import { LOOT_CATEGORIES, MODULE_ID } from "./constants.js";
import { CompendiumScanner } from "./compendium-scanner.js";
import { ItemFactory } from "./item-factory.js";
import { ThemeManager } from "./theme-manager.js";
import { TreasureBudget } from "./treasure-budget.js";
import { weightedPick } from "./weighted-picker.js";

export class LootGenerator {
  static async generate(options = {}) {
    const config = await this.#normalizeOptions(options);
    const candidates = await CompendiumScanner.getMatchingItems(config);
    const selectedRefs = this.#pickItems(candidates, config);
    const pf2eItems = await CompendiumScanner.hydrateItems(selectedRefs);
    const generatedItems = await ItemFactory.createGeneratedValuables(config);
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
        candidates: candidates.length
      }
    };
  }

  static async #normalizeOptions(options) {
    const level = Number(options.level ?? 1);
    const themeProfile = options.themeProfile ?? await ThemeManager.getTheme(options.theme ?? "generic");
    const budget = await TreasureBudget.calculate({ ...options, level });
    let budgetSplit = TreasureBudget.splitBudget(budget.targetGp, themeProfile);
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
      compendiums: options.compendiums ?? game.settings.get(MODULE_ID, "enabledCompendiums")
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
    const shuffled = foundry.utils.deepClone(items).sort(() => Math.random() - 0.5);
    const selected = [];
    let roughSpent = 0;

    for (const item of shuffled) {
      const roughValue = this.#roughItemValue(item);
      if (selected.length > 0 && roughSpent + roughValue > itemBudget * 1.35) continue;
      selected.push(item);
      roughSpent += roughValue;

      if (roughSpent >= itemBudget * 0.75) break;
      if (selected.length >= this.#maxItems(config)) break;
    }

    return selected.length ? selected : shuffled.slice(0, Math.min(1, shuffled.length));
  }

  static #itemBudget(config) {
    const split = config.budgetSplit ?? {};
    return Number(split.weapons ?? 0)
      + Number(split.armor ?? 0)
      + Number(split.consumables ?? 0)
      + Number(split.permanent ?? 0)
      + Number(split.magic ?? 0)
      + Number(split.alchemy ?? 0);
  }

  static #maxItems(config) {
    return { poor: 1, standard: 2, rich: 3, boss: 4, hoard: 6 }[config.treasureProfile] ?? 2;
  }

  static #roughItemValue(item) {
    const level = Number(item.level ?? 0);
    if (level <= 0) return 1;
    return Math.max(1, Math.round(Math.pow(level + 1, 2) * 0.75));
  }

  static #estimateTotalValueGp(coins, generatedItems, selectedRefs = []) {
    const coinGp = (coins.gp ?? 0) + ((coins.sp ?? 0) / 10) + ((coins.cp ?? 0) / 100) + ((coins.pp ?? 0) * 10);
    const generatedGp = generatedItems.reduce((sum, item) => sum + Number(item.system?.price?.value?.gp ?? 0), 0);
    const roughItemsGp = selectedRefs.reduce((sum, item) => sum + this.#roughItemValue(item), 0);
    return Math.round((coinGp + generatedGp + roughItemsGp) * 100) / 100;
  }
}
