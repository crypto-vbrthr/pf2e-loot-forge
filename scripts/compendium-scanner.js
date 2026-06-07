import { LOOT_CATEGORIES, RARITY_ORDER } from "./constants.js";

export class CompendiumScanner {
  static getAvailableItemPacks() {
    return game.packs.filter(pack => pack.documentName === "Item");
  }

  static async getMatchingItems(config) {
    const enabled = new Set(config.compendiums ?? []);
    const packs = this.getAvailableItemPacks().filter(pack => enabled.has(pack.collection));
    const results = [];

    for (const pack of packs) {
      let index;
      try {
        index = await pack.getIndex({
          fields: ["name", "type", "img", "system.level.value", "system.traits.rarity", "system.price.value", "system.category"]
        });
      } catch (error) {
        console.warn("PF2E Loot Forge | Could not index pack", pack.collection, error);
        continue;
      }

      for (const entry of index) {
        const level = Number(entry.system?.level?.value ?? 0);
        const rarity = entry.system?.traits?.rarity ?? "common";
        const category = this.#categoryForEntry(entry);

        if (level < config.itemLevelMin || level > config.itemLevelMax) continue;
        if (!this.#rarityAllowed(rarity, config.rarity)) continue;
        if (!this.#typeAllowed(entry.type, config)) continue;
        if (config.preferredCategories?.length && !config.preferredCategories.includes(category)) continue;

        results.push({
          uuid: `Compendium.${pack.collection}.${entry._id}`,
          name: entry.name,
          img: entry.img,
          type: entry.type,
          typeLabelKey: this.#typeLabelKey(entry.type),
          category,
          categoryLabelKey: this.#categoryLabelKey(category),
          level,
          rarity,
          pack: pack.collection
        });
      }
    }

    return results;
  }

  static async hydrateItems(selected = []) {
    const docs = [];
    for (const item of selected) {
      try {
        const doc = await fromUuid(item.uuid);
        if (doc) docs.push(doc.toObject());
      } catch (error) {
        console.warn("PF2E Loot Forge | Could not load item", item.uuid, error);
      }
    }
    return docs;
  }

  static #rarityAllowed(itemRarity, allowedRarity) {
    const itemIndex = RARITY_ORDER.indexOf(itemRarity);
    const allowedIndex = RARITY_ORDER.indexOf(allowedRarity);
    if (itemIndex === -1 || allowedIndex === -1) return itemRarity === "common";
    return itemIndex <= allowedIndex;
  }

  static #typeAllowed(type, config) {
    if (config.includeCombatGear && ["weapon", "armor", "shield", "equipment"].includes(type)) return true;
    if (config.includeConsumables && type === "consumable") return true;
    if (config.includePermanentItems && ["equipment", "weapon", "armor", "shield"].includes(type)) return true;
    if (type === "treasure") return true;
    return false;
  }

  static #categoryForEntry(entry) {
    if (entry.type === "weapon") return LOOT_CATEGORIES.WEAPONS;
    if (entry.type === "armor" || entry.type === "shield") return LOOT_CATEGORIES.ARMOR;
    if (entry.type === "consumable") return LOOT_CATEGORIES.CONSUMABLES;
    if (entry.type === "equipment") return LOOT_CATEGORIES.PERMANENT;
    if (entry.type === "treasure") return LOOT_CATEGORIES.VALUABLES;
    return LOOT_CATEGORIES.PERMANENT;
  }

  static #typeLabelKey(type) {
    return {
      weapon: "LF.ItemType.Weapon",
      armor: "LF.ItemType.Armor",
      shield: "LF.ItemType.Shield",
      consumable: "LF.ItemType.Consumable",
      equipment: "LF.ItemType.Equipment",
      treasure: "LF.ItemType.Treasure",
      backpack: "LF.ItemType.Backpack"
    }[type] ?? "LF.ItemType.Item";
  }

  static #categoryLabelKey(category) {
    return {
      weapons: "LF.Category.Weapons",
      armor: "LF.Category.Armor",
      consumables: "LF.Category.Consumables",
      permanent: "LF.Category.Permanent",
      valuables: "LF.Category.Valuables"
    }[category] ?? "LF.Category.Other";
  }
}
