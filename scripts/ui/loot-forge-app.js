import { MODULE_ID } from "../constants.js";
import { LootGenerator } from "../loot-generator.js";
import { LootForgeAPI } from "../api.js";
import { CompendiumScanner } from "../compendium-scanner.js";
import { lfLocalize } from "../localization-helper.js";

export class LootForgeApp extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "pf2e-loot-forge-app",
    tag: "form",
    window: { title: "PF2E Loot Forge", icon: "fa-solid fa-gem", resizable: true },
    position: { width: 820, height: "auto" },
    form: { handler: LootForgeApp.#onSubmit, submitOnChange: false, closeOnSubmit: false }
  };

  static PARTS = {
    form: { template: `modules/${MODULE_ID}/templates/loot-forge-app.hbs` }
  };

  constructor(options = {}) {
    super(options);
    this.result = null;
    this.lastConfig = null;
    this.targetActorId = options.targetActorId ?? null;
  }

  async _prepareContext() {
    const enabled = new Set(game.settings.get(MODULE_ID, "enabledCompendiums") ?? []);
    const packs = CompendiumScanner.getAvailableItemPacks().map(pack => ({
      collection: pack.collection,
      label: pack.metadata.label ?? pack.collection,
      checked: enabled.has(pack.collection)
    }));

    const actors = game.actors
      .filter(actor => actor.isOwner && ["loot", "character", "npc", "creature"].includes(actor.type))
      .map(actor => ({
        id: actor.id,
        name: actor.name,
        type: actor.type,
        typeLabel: actor.type === "loot" ? lfLocalize("LF.ActorType.Loot") : actor.type === "character" ? lfLocalize("LF.ActorType.Character") : lfLocalize("LF.ActorType.NPC"),
        isLoot: actor.type === "loot",
        selected: actor.id === this.targetActorId
      }))
      .sort((a, b) => {
        if (a.isLoot !== b.isLoot) return a.isLoot ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    return {
      config: this.lastConfig ?? {
        level: 1,
        partySize: 4,
        itemLevelMin: 0,
        itemLevelMax: 2,
        rarity: game.settings.get(MODULE_ID, "defaultRarity"),
        treasureProfile: "standard",
        theme: "generic",
        environment: "generic",
        lootTarget: "display",
        newLootActorName: "Loot Forge Treasure",
        includeCombatGear: false,
        includeConsumables: true,
        includePermanentItems: true,
        includeValuables: true,
        includeCuriosities: true
      },
      packs,
      actors,
      result: this.result,
      hasResult: Boolean(this.result)
    };
  }

  static async #onSubmit(event, form, formData) {
    event.preventDefault();

    const app = foundry.applications.instances.get("pf2e-loot-forge-app");
    const data = formData.object;
    const action = event.submitter?.dataset?.action ?? "generate";

    const config = LootForgeApp.#configFromFormData(data);

    if (action === "apply") {
      if (!app.result) {
        ui.notifications.warn(lfLocalize("LF.Notification.NoPreview"));
        return;
      }

      const actor = game.actors.get(data.targetActorId);
      if (!actor) {
        ui.notifications.warn(lfLocalize("LF.Notification.NoActor"));
        return;
      }

      await LootForgeAPI.addLootToActor(actor, app.result);
      return;
    }

    if (action === "create-loot-actor") {
      if (!app.result) {
        ui.notifications.warn(lfLocalize("LF.Notification.NoPreview"));
        return;
      }

      await LootForgeAPI.createLootActorWithLoot(data.newLootActorName, app.result);
      app.render({ force: true });
      return;
    }

    const enabledCompendiums = Object.entries(data)
      .filter(([key, value]) => key.startsWith("pack.") && value)
      .map(([key]) => key.replace(/^pack\./, ""));

    await game.settings.set(MODULE_ID, "enabledCompendiums", enabledCompendiums);

    config.compendiums = enabledCompendiums;
    app.result = await LootGenerator.generate(config);
    app.lastConfig = config;
    app.targetActorId = data.targetActorId ?? null;
    app.render({ force: true });
  }

  static #configFromFormData(data) {
    return {
      level: Number(data.level ?? 1),
      partySize: Number(data.partySize ?? 4),
      itemLevelMin: Number(data.itemLevelMin ?? 0),
      itemLevelMax: Number(data.itemLevelMax ?? 2),
      rarity: data.rarity ?? "common",
      treasureProfile: data.treasureProfile ?? "standard",
      theme: data.theme ?? "generic",
      environment: data.environment ?? "generic",
      lootTarget: data.lootTarget ?? "display",
      newLootActorName: data.newLootActorName ?? "Loot Forge Treasure",
      includeCombatGear: Boolean(data.includeCombatGear),
      includeConsumables: Boolean(data.includeConsumables),
      includePermanentItems: Boolean(data.includePermanentItems),
      includeValuables: Boolean(data.includeValuables),
      includeCuriosities: Boolean(data.includeCuriosities)
    };
  }
}
