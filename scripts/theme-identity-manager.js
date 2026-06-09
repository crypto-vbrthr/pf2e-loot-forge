import { MODULE_ID } from "./constants.js";

export class ThemeIdentityManager {
  static #data = null;

  static async getData() {
    if (this.#data) return this.#data;

    try {
      const response = await fetch(`modules/${MODULE_ID}/data/theme-modifiers.json`);
      this.#data = await response.json();
    } catch (error) {
      console.warn("PF2E Loot Forge | Could not load theme modifiers", error);
      this.#data = { generic: {} };
    }

    return this.#data;
  }

  static async getCategoryWeights(themeId = "generic") {
    const data = await this.getData();
    return data[themeId] ?? data.generic ?? {};
  }

  static combineWeights(...weightSets) {
    const keys = new Set(weightSets.flatMap(weights => Object.keys(weights ?? {})));
    const combined = {};

    for (const key of keys) {
      combined[key] = weightSets.reduce((product, weights) => product * Number(weights?.[key] ?? 1), 1);
    }

    return combined;
  }

  static weightedPick(categories = [], weights = {}) {
    if (!categories.length) return null;

    const weighted = categories.map(category => ({
      category,
      weight: Math.max(0.01, Number(weights?.[category] ?? 1))
    }));

    const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * total;

    for (const entry of weighted) {
      roll -= entry.weight;
      if (roll <= 0) return entry.category;
    }

    return weighted.at(-1)?.category ?? categories[0];
  }
}
