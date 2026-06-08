import { MODULE_ID } from "./constants.js";

export class TreasureBudget {
  static #data = null;

  static async getData() {
    if (this.#data) return this.#data;

    try {
      const response = await fetch(`modules/${MODULE_ID}/data/templates/treasure-budgets.json`);
      this.#data = await response.json();
    } catch (error) {
      console.warn("PF2E Loot Forge | Could not load treasure budgets", error);
      this.#data = {
        profiles: { poor: 0.5, standard: 1, rich: 1.5, boss: 2, hoard: 4 },
        levelBudgetsGp: { "1": 4 },
        partySizeBaseline: 4
      };
    }

    return this.#data;
  }

  static async calculate(config = {}) {
    const data = await this.getData();
    const level = Math.max(-1, Math.min(25, Number(config.level ?? 1)));
    const partySize = Math.max(1, Number(config.partySize ?? data.partySizeBaseline ?? 4));
    const profile = config.treasureProfile ?? "standard";

    const base = Number(data.levelBudgetsGp[String(level)] ?? data.levelBudgetsGp["1"] ?? 4);
    const profileMultiplier = Number(data.profiles?.[profile] ?? 1);
    const partyMultiplier = partySize / Number(data.partySizeBaseline ?? 4);

    const targetGp = Math.max(1, Math.round(base * profileMultiplier * partyMultiplier));

    return {
      level,
      partySize,
      profile,
      baseGp: base,
      profileMultiplier,
      partyMultiplier,
      targetGp
    };
  }

  static splitBudget(targetGp, themeProfile = {}) {
    const weights = themeProfile.weights ?? {};
    const totalWeight = Object.values(weights).reduce((sum, value) => sum + Number(value), 0) || 1;

    const split = {};
    for (const [category, weight] of Object.entries(weights)) {
      split[category] = Math.round((targetGp * Number(weight) / totalWeight) * 100) / 100;
    }

    return split;
  }
}
