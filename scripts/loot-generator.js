import { MODULE_ID } from "./constants.js";
import { CompendiumScanner } from "./compendium-scanner.js";
import { ItemFactory } from "./item-factory.js";

export class LootGenerator {
  static async generate(options = {}) {
    const config = this.#normalizeOptions(options);
    const candidates = await CompendiumScanner.getMatchingItems(config);
    const selectedRefs = this.#pickItems(candidates, config);
    const pf2eItems = await CompendiumScanner.hydrateItems(selectedRefs);
    const generatedItems = await ItemFactory.createGeneratedValuables(config);
    const coins = ItemFactory.createCoins(config);

    return {
      coins,
      pf2eItems,
      generatedItems,
      selectedRefs,
      summary: {
        level: config.level,
        theme: config.theme,
        environment: config.environment,
        treasureProfile: config.treasureProfile,
        candidates: candidates.length
      }
    };
  }

  static #normalizeOptions(options) {
    const level = Number(options.level ?? 1);

    return {
      level,
      partySize: Number(options.partySize ?? 4),
      lootType: options.lootType ?? "encounter",
      lootTarget: options.lootTarget ?? "display",
      treasureProfile: options.treasureProfile ?? "standard",
      theme: options.theme ?? "generic",
      environment: options.environment ?? "generic",
      rarity: options.rarity ?? game.settings.get(MODULE_ID, "defaultRarity"),
      itemLevelMin: Number(options.itemLevelMin ?? Math.max(0, level - 2)),
      itemLevelMax: Number(options.itemLevelMax ?? level + 1),
      includeCombatGear: Boolean(options.includeCombatGear ?? false),
      includeConsumables: Boolean(options.includeConsumables ?? true),
      includePermanentItems: Boolean(options.includePermanentItems ?? true),
      includeValuables: Boolean(options.includeValuables ?? game.settings.get(MODULE_ID, "includeGeneratedValuables")),
      includeCuriosities: Boolean(options.includeCuriosities ?? true),
      compendiums: options.compendiums ?? game.settings.get(MODULE_ID, "enabledCompendiums")
    };
  }

  static #pickItems(items, config) {
    if (!items.length) return [];

    const amount = {
      poor: 1,
      standard: 2,
      rich: 3,
      boss: 4,
      hoard: 6
    }[config.treasureProfile] ?? 2;

    return foundry.utils.deepClone(items)
      .sort(() => Math.random() - 0.5)
      .slice(0, amount);
  }
}
