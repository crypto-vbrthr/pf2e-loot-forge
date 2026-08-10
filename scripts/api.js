import { LootGenerator } from "./loot-generator.js";
import { lfFormat, lfLocalize } from "./localization-helper.js";
import { ThemeManager } from "./theme-manager.js";
import { EmbeddedLootForge } from "./ui/embedded-loot-forge.js";

export class LootForgeAPI {
  static get embeddedContractVersion() {
    return EmbeddedLootForge.CONTRACT_VERSION;
  }

  static createEmbeddedEditor(options = {}) {
    return new EmbeddedLootForge(options);
  }

  static async generateLoot(options = {}) {
    return LootGenerator.generate(options);
  }

  static async generateLootForCreature(creatureData = {}) {
    const themeProfile = await ThemeManager.inferThemeFromCreature(creatureData);

    return LootGenerator.generate({
      level: creatureData.level ?? 1,
      creatureTraits: creatureData.traits ?? [],
      creatureRole: creatureData.role ?? "standard",
      theme: themeProfile.id,
      themeProfile,
      environment: creatureData.environment ?? "generic",
      lootType: "creature",
      treasureProfile: creatureData.treasureProfile ?? "standard",
      includeCombatGear: creatureData.includeCombatGear ?? true,
      includeConsumables: creatureData.includeConsumables ?? true,
      includePermanentItems: creatureData.includePermanentItems ?? true,
      includeValuables: creatureData.includeValuables ?? true,
      includeCuriosities: creatureData.includeCuriosities ?? true,
      compendiums: creatureData.compendiums
    });
  }

  static async generateInventoryForCreature(creatureData = {}) {
    const loot = await this.generateLootForCreature({
      ...creatureData,
      includeCombatGear: creatureData.includeCombatGear ?? true,
      includeValuables: creatureData.includeValuables ?? false,
      includeCuriosities: creatureData.includeCuriosities ?? false,
      treasureProfile: creatureData.treasureProfile ?? "standard",
      lootStyle: creatureData.lootStyle ?? 85
    });

    return {
      combatGear: loot.pf2eItems ?? [],
      consumables: (loot.pf2eItems ?? []).filter(item => item.type === "consumable"),
      treasure: loot.generatedItems ?? [],
      documents: [],
      curiosities: [],
      coins: loot.coins ?? {},
      editable: true,
      raw: loot
    };
  }

  static async addLootToActor(actor, loot, options = {}) {
    if (!actor) {
      ui.notifications.warn(lfLocalize("LF.Notification.NoActor"));
      return [];
    }

    await this.#addCurrencyToActor(actor, loot?.coins ?? {});

    const mystifyMagicItems = options.mystifyMagicItems ?? game.settings.get("pf2e-loot-forge", "mystifyMagicItems");

    const pf2eItems = foundry.utils.deepClone(loot?.pf2eItems ?? []);
    const preparedPf2eItems = mystifyMagicItems
      ? pf2eItems.map(item => this.#mystifyMagicItem(item))
      : pf2eItems;

    const itemData = [
      ...preparedPf2eItems,
      ...(loot?.generatedItems ?? [])
    ];

    if (!itemData.length) {
      ui.notifications.info(lfLocalize("LF.Notification.NoLoot"));
      return [];
    }

    const created = await actor.createEmbeddedDocuments("Item", itemData);
    ui.notifications.info(lfFormat("LF.Notification.AddedToActor", { count: created.length, actor: actor.name }));
    return created;
  }

  static async #addCurrencyToActor(actor, coins = {}) {
    const current = actor.system?.currency ?? {};
    const next = {
      cp: Number(current.cp?.value ?? current.cp ?? 0) + Number(coins.cp ?? 0),
      sp: Number(current.sp?.value ?? current.sp ?? 0) + Number(coins.sp ?? 0),
      gp: Number(current.gp?.value ?? current.gp ?? 0) + Number(coins.gp ?? 0),
      pp: Number(current.pp?.value ?? current.pp ?? 0) + Number(coins.pp ?? 0)
    };

    await actor.update({
      "system.currency.cp": next.cp,
      "system.currency.sp": next.sp,
      "system.currency.gp": next.gp,
      "system.currency.pp": next.pp
    });
  }

  static #mystifyMagicItem(item) {
    if (!this.#isMagicItem(item)) return item;

    item.system ??= {};
    item.system.identification ??= {};

    if ("status" in item.system.identification || item.system.identification.status === undefined) {
      item.system.identification.status = "unidentified";
    }

    if ("identified" in item.system.identification || item.system.identification.identified === undefined) {
      item.system.identification.identified = false;
    }

    item.flags ??= {};
    item.flags["pf2e-loot-forge"] ??= {};
    item.flags["pf2e-loot-forge"].mystified = true;

    return item;
  }

  static #isMagicItem(item) {
    const traits = item.system?.traits?.value ?? item.system?.traits?.otherTags ?? [];
    if (Array.isArray(traits) && traits.includes("magical")) return true;
    if (Array.isArray(traits) && traits.includes("magic")) return true;

    const category = item.system?.category;
    if (typeof category === "string" && category.toLowerCase().includes("magic")) return true;

    const usage = item.system?.usage?.value;
    const itemName = item.name?.toLowerCase?.() ?? "";
    return itemName.includes("wand")
      || itemName.includes("scroll")
      || itemName.includes("staff")
      || itemName.includes("rune")
      || itemName.includes("zauberstab")
      || itemName.includes("schriftrolle")
      || itemName.includes("stab")
      || itemName.includes("rune");
  }

  static async createLootActorWithLoot(name, loot) {
    const actorName = name?.trim() || "Loot Forge Treasure";
    const actor = await Actor.create({
      name: actorName,
      type: "loot",
      img: "icons/containers/chest/chest-reinforced-steel-red.webp"
    });

    await this.addLootToActor(actor, loot);
    ui.notifications.info(lfFormat("LF.Notification.CreatedLootActor", { actor: actor.name }));
    return actor;
  }
}
