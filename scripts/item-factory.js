import { COIN_IMAGE, GENERATED_ITEM_IMAGE } from "./constants.js";
import { GeneratedLibrary } from "./generated-library.js";
import { lfFormat, lfLocalize } from "./localization-helper.js";

export class ItemFactory {
  static createCoins(config) {
    const budget = Number(config.budgetSplit?.coins ?? 0);
    const fallback = Math.max(1, config.level * 5);
    const gp = Math.max(0, Math.round(budget || fallback));

    return { cp: 0, sp: 0, gp, pp: 0 };
  }

  static createCoinTreasureItems(coins = {}) {
    const items = [];
    for (const [denomination, amount] of Object.entries(coins)) {
      if (!amount || amount <= 0) continue;
      items.push({
        name: lfFormat("LF.Item.Coins.Name", {
          amount,
          denomination: lfLocalize(`LF.Currency.${denomination.toUpperCase()}`)
        }),
        type: "treasure",
        img: COIN_IMAGE,
        system: {
          description: { value: `<p>${lfLocalize("LF.Item.Coins.Description")}</p>` },
          price: { value: { [denomination]: 1 } },
          quantity: amount,
          bulk: { value: 0 },
          stackGroup: "coins"
        }
      });
    }
    return items;
  }

  static async createGeneratedValuables(config) {
    const items = [];
    const themeId = config.themeProfile?.id ?? "generic";
    const library = await GeneratedLibrary.loadAll();

    if (config.includeValuables) {
      const valueBudget = Number(config.budgetSplit?.art ?? 0) + Number(config.budgetSplit?.valuables ?? 0) + Number(config.budgetSplit?.religious ?? 0);
      const valuableCount = this.#countForStyle(config, "valuable");
      const pools = [library.paintings, library.statues, library.jewelry, library.beverages];

      for (let i = 0; i < valuableCount; i++) {
        const pool = GeneratedLibrary.filterByTheme(pools[i % pools.length], themeId);
        const entry = GeneratedLibrary.random(pool);
        const item = this.#entryToTreasure(entry, config, valueBudget / valuableCount, "valuable");
        if (item) items.push(item);
      }
    }

    if (config.includeCuriosities) {
      const curiosityBudget = Number(config.budgetSplit?.curiosities ?? 0) + Number(config.budgetSplit?.documents ?? 0);
      const curiosityCount = this.#countForStyle(config, "curiosity");
      const pools = [library.curiosities, library.documents];

      for (let i = 0; i < curiosityCount; i++) {
        const pool = GeneratedLibrary.filterByTheme(pools[i % pools.length], themeId);
        const entry = GeneratedLibrary.random(pool);
        const item = this.#entryToTreasure(entry, config, curiosityBudget / curiosityCount, "curiosity");
        if (item) items.push(item);
      }
    }

    return items.filter(Boolean);
  }

  static #countForStyle(config, kind) {
    const style = Number(config.lootStyle ?? 50);

    if (kind === "valuable") {
      if (style <= 25) return 3;
      if (style <= 60) return 2;
      return 1;
    }

    if (style <= 25) return 3;
    if (style <= 60) return 2;
    return 1;
  }

  static #entryToTreasure(entry, config, budget, kind) {
    if (!entry) return null;

    const value = Math.max(kind === "curiosity" ? 0 : 1, Math.round((budget || config.level * 3) * Number(entry.valueWeight ?? 1)));

    let name = "";
    let description = "";

    if (entry.subject && entry.background && entry.condition) {
      name = lfFormat("LF.Template.Art.Painting.Scene.Name", {
        subject: lfLocalize(entry.subject),
        background: lfLocalize(entry.background)
      });
      description = lfFormat("LF.Template.Art.Painting.Scene.Description", {
        subject: lfLocalize(entry.subject),
        background: lfLocalize(entry.background),
        condition: lfLocalize(entry.condition)
      });
    } else if (entry.material && entry.subject) {
      name = lfFormat("LF.Template.Art.Statue.Name", {
        material: lfLocalize(entry.material),
        subject: lfLocalize(entry.subject)
      });
      description = lfFormat("LF.Template.Art.Statue.Description", {
        material: lfLocalize(entry.material),
        subject: lfLocalize(entry.subject)
      });
    } else if (entry.kind && entry.detail) {
      name = lfFormat("LF.Template.Art.Jewelry.Name", {
        kind: lfLocalize(entry.kind)
      });
      description = lfFormat("LF.Template.Art.Jewelry.Description", {
        kind: lfLocalize(entry.kind),
        detail: lfLocalize(entry.detail)
      });
    } else if (entry.name && entry.origin) {
      name = lfFormat("LF.Template.Valuable.Beverage.Name", {
        beverage: lfLocalize(entry.name)
      });
      description = lfFormat("LF.Template.Valuable.Beverage.Description", {
        beverage: lfLocalize(entry.name),
        origin: lfLocalize(entry.origin)
      });
    } else if (entry.name && entry.description) {
      name = lfLocalize(entry.name);
      description = lfLocalize(entry.description);
    }

    if (!name) return null;

    return this.#createTreasureItem({ name, description, value });
  }

  static #createTreasureItem({ name, description, value }) {
    return {
      name,
      type: "treasure",
      img: GENERATED_ITEM_IMAGE,
      system: {
        description: { value: `<p>${description}</p>` },
        price: { value: { gp: value } },
        quantity: 1,
        bulk: { value: 0 },
        stackGroup: ""
      }
    };
  }
}
