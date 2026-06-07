import { MODULE_ID } from "./constants.js";

export class GeneratedLibrary {
  static #cache = {};

  static async load(path) {
    if (this.#cache[path]) return this.#cache[path];

    try {
      const response = await fetch(`modules/${MODULE_ID}/${path}`);
      this.#cache[path] = await response.json();
    } catch (error) {
      console.warn(`PF2E Loot Forge | Could not load generated library ${path}`, error);
      this.#cache[path] = [];
    }

    return this.#cache[path];
  }

  static async loadAll() {
    const [paintings, statues, jewelry, beverages, curiosities, documents] = await Promise.all([
      this.load("data/art/paintings.json"),
      this.load("data/art/statues.json"),
      this.load("data/art/jewelry.json"),
      this.load("data/beverages/beverages.json"),
      this.load("data/curiosities/curiosities.json"),
      this.load("data/documents/documents.json")
    ]);

    return { paintings, statues, jewelry, beverages, curiosities, documents };
  }

  static filterByTheme(items = [], themeId = "generic") {
    const themed = items.filter(item => item.theme?.includes(themeId));
    return themed.length ? themed : items.filter(item => item.theme?.includes("generic"));
  }

  static random(items = []) {
    if (!items.length) return null;
    return items[Math.floor(Math.random() * items.length)];
  }
}
