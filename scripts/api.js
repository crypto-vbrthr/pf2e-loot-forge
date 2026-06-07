import { LootGenerator } from "./loot-generator.js";
import { ItemFactory } from "./item-factory.js";
import { lfFormat, lfLocalize } from "./localization-helper.js";

export class LootForgeAPI {
  static async generateLoot(options = {}) {
    return LootGenerator.generate(options);
  }

  static async generateLootForCreature(creatureData = {}) {
    return LootGenerator.generate({
      level: creatureData.level ?? 1,
      creatureTraits: creatureData.traits ?? [],
      creatureRole: creatureData.role ?? "standard",
      theme: creatureData.theme ?? "generic",
      environment: creatureData.environment ?? "generic",
      lootType: "creature",
      treasureProfile: creatureData.treasureProfile ?? "standard",
      includeCombatGear: creatureData.includeCombatGear ?? false,
      includeConsumables: true,
      includePermanentItems: true,
      includeValuables: true,
      includeCuriosities: true
    });
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
