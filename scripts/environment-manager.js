import { MODULE_ID } from "./constants.js";
import { lfLocalize } from "./localization-helper.js";

export class EnvironmentManager {
  static #data = null;

  static async getData() {
    if (this.#data) return this.#data;

    try {
      const response = await fetch(`modules/${MODULE_ID}/data/environment-modifiers.json`);
      this.#data = await response.json();
    } catch (error) {
      console.warn("PF2E Loot Forge | Could not load environment modifiers", error);
      this.#data = { generic: { labelKey: "LF.Environment.Generic", categoryWeights: {} } };
    }

    return this.#data;
  }

  static async getOptions(selected = "generic") {
    const data = await this.getData();

    return Object.entries(data).map(([id, environment]) => ({
      id,
      label: lfLocalize(environment.labelKey ?? `LF.Environment.${id}`),
      selected: id === selected
    }));
  }

  static async getEnvironment(id = "generic") {
    const data = await this.getData();
    return data[id] ?? data.generic ?? { categoryWeights: {} };
  }


static mergeConditions(baseConditions = [], environment = {}) {
  const additions = environment?.conditionAdditions ?? [];
  if (!Array.isArray(additions) || !additions.length) return baseConditions;

  return [...baseConditions, ...additions, ...additions];
}

  static weightedPick(categories = [], weights = {}) {
    if (!categories.length) return null;

    const weighted = categories.map(category => ({
      category,
      weight: Math.max(0.01, Number(weights[category] ?? 1))
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
