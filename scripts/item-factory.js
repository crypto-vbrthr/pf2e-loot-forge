import { COIN_IMAGE, GENERATED_ITEM_IMAGE } from "./constants.js";
import { lfFormat, lfLocalize } from "./localization-helper.js";

export class ItemFactory {
  static createCoins(config) {
    const multiplier = { poor: 2, standard: 5, rich: 8, boss: 12, hoard: 20 }[config.treasureProfile] ?? 5;
    return { cp: 0, sp: 0, gp: Math.max(1, config.level * multiplier), pp: 0 };
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

    if (config.includeValuables) {
      items.push(this.#createTreasureItem({
        name: lfFormat("LF.Template.Art.Painting.Scene.Name", {
          subject: lfLocalize("LF.Subject.Dragon"),
          background: lfLocalize("LF.Background.Volcano")
        }),
        description: lfFormat("LF.Template.Art.Painting.Scene.Description", {
          subject: lfLocalize("LF.Subject.Dragon"),
          background: lfLocalize("LF.Background.Volcano"),
          condition: lfLocalize("LF.Condition.SootStained")
        }),
        value: Math.max(5, config.level * 10)
      }));

      items.push(this.#createTreasureItem({
        name: lfFormat("LF.Template.Valuable.Beverage.Name", {
          beverage: lfLocalize("LF.Beverage.Lavabrand")
        }),
        description: lfFormat("LF.Template.Valuable.Beverage.Description", {
          beverage: lfLocalize("LF.Beverage.Lavabrand"),
          origin: lfLocalize("LF.Origin.DongunHold")
        }),
        value: Math.max(3, config.level * 6)
      }));
    }

    if (config.includeCuriosities) {
      items.push(this.#createTreasureItem({
        name: lfLocalize("LF.Curiosity.FogBottle.Name"),
        description: lfLocalize("LF.Curiosity.FogBottle.Description"),
        value: Math.max(1, config.level * 3)
      }));
    }

    return items;
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
