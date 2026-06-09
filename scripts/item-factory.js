import { EnvironmentManager } from "./environment-manager.js";
import { COIN_IMAGE } from "./constants.js";
import { GeneratedTreasureFactory } from "./generated/generated-treasure-factory.js";
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
    const environment = await EnvironmentManager.getEnvironment(config.environment ?? "generic");
    const environmentCategoryWeights = environment.categoryWeights ?? {};

    if (config.includeValuables) {
      const valueBudget =
        Number(config.budgetSplit?.art ?? 0)
        + Number(config.budgetSplit?.valuables ?? 0)
        + Number(config.budgetSplit?.religious ?? 0);

      const valuableCount = this.#countForStyle(config, "valuable");
      const categories = ["painting", "statue", "jewelry", "beverage", "textile", "instrument", "collectible", "craftsmanship"];

      for (let i = 0; i < valuableCount; i++) {
        const category = EnvironmentManager.weightedPick(categories, environmentCategoryWeights);
        items.push(await GeneratedTreasureFactory.generate({
          category,
          themeId,
          environmentId: config.environment ?? "generic",
          valueBudget: valueBudget / valuableCount
        }));
      }
    }

    if (config.includeCuriosities) {
      const curiosityBudget =
        Number(config.budgetSplit?.curiosities ?? 0)
        + Number(config.budgetSplit?.documents ?? 0);

      const curiosityCount = this.#countForStyle(config, "curiosity");
      const categories = ["curiosity", "document", "collectible"];

      for (let i = 0; i < curiosityCount; i++) {
        const category = EnvironmentManager.weightedPick(categories, environmentCategoryWeights);
        items.push(await GeneratedTreasureFactory.generate({
          category,
          themeId,
          environmentId: config.environment ?? "generic",
          valueBudget: curiosityBudget / curiosityCount
        }));
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
}
