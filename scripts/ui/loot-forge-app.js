import { MODULE_ID } from "../constants.js";
import { LootGenerator } from "../loot-generator.js";
import { LootForgeAPI } from "../api.js";
import { CompendiumScanner } from "../compendium-scanner.js";
import { lfLocalize } from "../localization-helper.js";

export class LootForgeApp extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "pf2e-loot-forge-app",
    tag: "form",
    window: {
      title: "PF2E Loot Forge",
      icon: "fa-solid fa-gem",
      resizable: true
    },
    position: {
      width: 780,
      height: "auto"
    },
    form: {
      handler: LootForgeApp.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: false
    }
  };

  static PARTS = {
    form: {
      template: `modules/${MODULE_ID}/templates/loot-forge-app.hbs`
    }
  };

  constructor(options = {}) {
    super(options);
    this.result = null;
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
      .filter(actor => actor.isOwner)
      .map(actor => ({
        id: actor.id,
        name: actor.name,
        selected: actor.id === this.targetActorId
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      level: 1,
      partySize: 4,
      itemLevelMin: 0,
      itemLevelMax: 2,
      rarity: game.settings.get(MODULE_ID, "defaultRarity"),
      packs,
      actors,
      result: this.result,
      hasResult: Boolean(this.result),
      canApplyToActor: Boolean(this.result)
    };
  }

  static async #onSubmit(event, form, formData) {
    event.preventDefault();

    const app = foundry.applications.instances.get("pf2e-loot-forge-app");
    const data = formData.object;

    const enabledCompendiums = Object.entries(data)
      .filter(([key, value]) => key.startsWith("pack.") && value)
      .map(([key]) => key.replace(/^pack\./, ""));

    await game.settings.set(MODULE_ID, "enabledCompendiums", enabledCompendiums);

    const result = await LootGenerator.generate({
      level: Number(data.level ?? 1),
      partySize: Number(data.partySize ?? 4),
      itemLevelMin: Number(data.itemLevelMin ?? 0),
      itemLevelMax: Number(data.itemLevelMax ?? 2),
      rarity: data.rarity ?? "common",
      treasureProfile: data.treasureProfile ?? "standard",
      theme: data.theme ?? "generic",
      environment: data.environment ?? "generic",
      lootTarget: data.lootTarget ?? "display",
      includeCombatGear: Boolean(data.includeCombatGear),
      includeConsumables: Boolean(data.includeConsumables),
      includePermanentItems: Boolean(data.includePermanentItems),
      includeValuables: Boolean(data.includeValuables),
      includeCuriosities: Boolean(data.includeCuriosities),
      compendiums: enabledCompendiums
    });

    app.result = result;
    app.targetActorId = data.targetActorId ?? null;

    if (data.lootTarget === "selectedActor") {
      const actor = game.actors.get(app.targetActorId);
      if (actor) await LootForgeAPI.addLootToActor(actor, result);
      else ui.notifications.warn(lfLocalize("LF.Notification.NoActor"));
    }

    app.render({ force: true });
  }
}
