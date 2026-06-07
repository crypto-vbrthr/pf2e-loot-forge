import { LootGenerator } from "./loot-generator.js";
import { ItemFactory } from "./item-factory.js";
import { lfFormat, lfLocalize } from "./localization-helper.js";
import { ThemeManager } from "./theme-manager.js";

export class LootForgeAPI {
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
      raw: loot
    };
  }

  static async addLootToActor(actor, loot) {
    if (!actor) {
      ui.notifications.warn(lfLocalize("LF.Notification.NoActor"));
      return [];
    }

    const itemData = [
      ...(loot?.pf2eItems ?? []),
      ...(loot?.generatedItems ?? []),
      ...ItemFactory.createCoinTreasureItems(loot?.coins ?? {})
    ];

    if (!itemData.length) {
      ui.notifications.info(lfLocalize("LF.Notification.NoLoot"));
      return [];
    }

    const created = await actor.createEmbeddedDocuments("Item", itemData);
    ui.notifications.info(lfFormat("LF.Notification.AddedToActor", { count: created.length, actor: actor.name }));
    return created;
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
