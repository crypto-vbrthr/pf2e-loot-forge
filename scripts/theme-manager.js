import { MODULE_ID } from "./constants.js";

export class ThemeManager {
  static #themes = null;

  static async getThemes() {
    if (this.#themes) return this.#themes;

    try {
      const response = await fetch(`modules/${MODULE_ID}/data/themes/themes.json`);
      this.#themes = await response.json();
    } catch (error) {
      console.warn("PF2E Loot Forge | Could not load themes", error);
      this.#themes = [{
        id: "generic",
        name: "LF.Theme.Generic",
        weights: { coins: 30, consumables: 20, permanent: 20, art: 10, valuables: 10, curiosities: 10 },
        tags: ["generic"],
        monsterTraits: []
      }];
    }

    return this.#themes;
  }

  static async getTheme(themeId = "generic") {
    const themes = await this.getThemes();
    return themes.find(theme => theme.id === themeId) ?? themes.find(theme => theme.id === "generic") ?? themes[0];
  }

  static async inferThemeFromCreature(creatureData = {}) {
    const traits = new Set((creatureData.traits ?? []).map(t => String(t).toLowerCase()));
    const explicitTheme = creatureData.theme;

    if (explicitTheme && explicitTheme !== "generic") {
      return this.getTheme(explicitTheme);
    }

    const themes = await this.getThemes();

    for (const theme of themes) {
      const monsterTraits = theme.monsterTraits ?? [];
      if (monsterTraits.some(trait => traits.has(String(trait).toLowerCase()))) return theme;
    }

    return this.getTheme("generic");
  }
}
