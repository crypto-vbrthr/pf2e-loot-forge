import { MODULE_ID } from "./constants.js";

export class TreasureProfileManager {
  static #defaultData = null;

  static async getDefaultData() {
    if (this.#defaultData) return this.#defaultData;

    try {
      const response = await fetch(`modules/${MODULE_ID}/data/templates/treasure-profiles.json`);
      this.#defaultData = await response.json();
    } catch (error) {
      console.warn("PF2E Loot Forge | Could not load treasure profiles", error);
      this.#defaultData = {
        activeProfile: "pf2e-standard",
        profiles: [{
          id: "pf2e-standard",
          name: "PF2E Standard",
          budgetsGp: { "1": 4 },
          categoryWeights: { coins: 25, consumables: 15, permanent: 30, art: 15, valuables: 10, curiosities: 5 }
        }]
      };
    }

    return this.#defaultData;
  }

  static async getWorldData() {
    const stored = game.settings.get(MODULE_ID, "treasureProfiles");
    if (stored?.profiles?.length) return stored;

    const defaults = await this.getDefaultData();
    await game.settings.set(MODULE_ID, "treasureProfiles", foundry.utils.deepClone(defaults));
    return foundry.utils.deepClone(defaults);
  }

  static async getActiveProfile() {
    const data = await this.getWorldData();
    const activeId = game.settings.get(MODULE_ID, "activeTreasureProfile") || data.activeProfile || "pf2e-standard";
    return data.profiles.find(profile => profile.id === activeId)
      ?? data.profiles.find(profile => profile.id === "pf2e-standard")
      ?? data.profiles[0];
  }

  static async getProfiles() {
    const data = await this.getWorldData();
    return data.profiles ?? [];
  }

  static async saveProfiles(data) {
    await game.settings.set(MODULE_ID, "treasureProfiles", data);
  }

  static async resetToDefaults() {
    const defaults = foundry.utils.deepClone(await this.getDefaultData());
    await game.settings.set(MODULE_ID, "treasureProfiles", defaults);
    await game.settings.set(MODULE_ID, "activeTreasureProfile", defaults.activeProfile ?? "pf2e-standard");
    return defaults;
  }

  static cloneProfile(profile, name) {
    const clone = foundry.utils.deepClone(profile);
    const slug = name.slugify?.() ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    clone.id = slug || `custom-${Date.now()}`;
    clone.name = name;
    clone.description = "";
    return clone;
  }
}
