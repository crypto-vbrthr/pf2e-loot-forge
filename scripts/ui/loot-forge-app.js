import { MODULE_ID } from "../constants.js";
import { LootGenerator } from "../loot-generator.js";
import { LootForgeAPI } from "../api.js";
import { CompendiumScanner } from "../compendium-scanner.js";
import { lfLocalize } from "../localization-helper.js";
import { ThemeManager } from "../theme-manager.js";
import { GeneratedTreasureFactory } from "../generated/generated-treasure-factory.js";

export class LootForgeApp extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "pf2e-loot-forge-app",
    tag: "form",
    window: { title: "PF2E Loot Forge", icon: "fa-solid fa-gem", resizable: true },
    position: { width: 1240, height: 760 },
    form: { handler: LootForgeApp.#onSubmit, submitOnChange: false, closeOnSubmit: false }
  };

  static PARTS = {
    form: { template: `modules/${MODULE_ID}/templates/loot-forge-app.hbs` }
  };

  constructor(options = {}) {
    super(options);
    this.result = null;
    this.editableLoot = null;
    this.lastConfig = null;
    this.targetActorId = options.targetActorId ?? null;
  }


  async _prepareContext() {
    const config = this.#getRenderConfig();

    const enabled = new Set(game.settings.get(MODULE_ID, "enabledCompendiums") ?? []);
    const packs = CompendiumScanner.getAvailableItemPacks().map(pack => ({
      collection: pack.collection,
      label: pack.metadata.label ?? pack.collection,
      checked: enabled.has(pack.collection)
    }));

    const themes = (await ThemeManager.getThemes()).map(theme => ({
      id: theme.id,
      name: lfLocalize(theme.name),
      selected: theme.id === config.theme
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

    const rarityOptions = ["common", "uncommon", "rare", "unique"].map(value => ({
      value,
      label: lfLocalize(`LF.Rarity.${value.charAt(0).toUpperCase()}${value.slice(1)}`),
      selected: value === config.rarity
    }));

    const treasureProfileOptions = ["poor", "standard", "rich", "boss", "hoard"].map(value => ({
      value,
      label: lfLocalize(`LF.Profile.${value.charAt(0).toUpperCase()}${value.slice(1).replace("hoard", "Hoard")}`),
      selected: value === config.treasureProfile
    }));

    return {
      config,
      rarityOptions,
      treasureProfileOptions,
      packs,
      themes,
      actors,
      result: this.editableLoot ?? this.result,
      hasResult: Boolean(this.editableLoot ?? this.result)
    };
  }

  #getRenderConfig() {
    return foundry.utils.mergeObject({
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
      lootStyle: 50,
      includeCombatGear: false,
      includeConsumables: true,
      includePermanentItems: true,
      includeValuables: true,
      includeCuriosities: true,
      mystifyMagicItems: game.settings.get(MODULE_ID, "mystifyMagicItems")
    }, this.lastConfig ?? {}, { inplace: false });
  }

  _onRender(context, options) {
    super._onRender(context, options);

    const element = this.element;
    const levelInput = element.querySelector('input[name="level"]');
    const minInput = element.querySelector('input[name="itemLevelMin"]');
    const maxInput = element.querySelector('input[name="itemLevelMax"]');

    if (!levelInput || !minInput || !maxInput) return;

    const updateRange = () => {
      const level = Number(levelInput.value ?? 1);
      const min = Math.max(0, level - 2);
      const max = Math.max(0, level + 1);

      minInput.value = String(min);
      maxInput.value = String(max);
    };

    levelInput.addEventListener("change", updateRange);
    levelInput.addEventListener("input", updateRange);

    const selectAllPacksButton = element.querySelector("[data-action='select-all-packs']");
    const deselectAllPacksButton = element.querySelector("[data-action='deselect-all-packs']");
    const packCheckboxes = () => Array.from(element.querySelectorAll("input[name^='pack.']"));

    selectAllPacksButton?.addEventListener("click", event => {
      event.preventDefault();
      packCheckboxes().forEach(input => input.checked = true);
    });

    deselectAllPacksButton?.addEventListener("click", event => {
      event.preventDefault();
      packCheckboxes().forEach(input => input.checked = false);
    });
  }


  static #syncEditsFromForm(app, data) {
    if (!app.editableLoot) return;

    app.editableLoot.coins = {
      cp: Number(data.coinCp ?? app.editableLoot.coins?.cp ?? 0),
      sp: Number(data.coinSp ?? app.editableLoot.coins?.sp ?? 0),
      gp: Number(data.coinGp ?? app.editableLoot.coins?.gp ?? 0),
      pp: Number(data.coinPp ?? app.editableLoot.coins?.pp ?? 0)
    };

    const generatedItems = app.editableLoot.generatedItems ?? [];
    for (let index = 0; index < generatedItems.length; index++) {
      const value = data[`generatedValue.${index}`];
      if (value === undefined) continue;

      generatedItems[index].system ??= {};
      generatedItems[index].system.price ??= {};
      generatedItems[index].system.price.value ??= {};
      generatedItems[index].system.price.value.gp = Math.max(0, Number(value ?? 0));
    }

    app.editableLoot.totalValueGp = LootForgeApp.#estimateTotalValue(app.editableLoot);
    app.editableLoot.budgetDeltaGp = Math.round((app.editableLoot.totalValueGp - (app.editableLoot.budget?.targetGp ?? 0)) * 100) / 100;
  }

  static #estimateTotalValue(loot) {
    const coins = loot?.coins ?? {};
    const coinGp = Number(coins.gp ?? 0) + Number(coins.sp ?? 0) / 10 + Number(coins.cp ?? 0) / 100 + Number(coins.pp ?? 0) * 10;
    const generatedGp = (loot?.generatedItems ?? []).reduce((sum, item) => sum + Number(item.system?.price?.value?.gp ?? 0), 0);
    const roughPf2eGp = (loot?.selectedRefs ?? []).reduce((sum, item) => {
      const level = Number(item.level ?? 0);
      return sum + Math.max(1, Math.round(Math.pow(level + 1, 2) * 0.75));
    }, 0);

    return Math.round((coinGp + generatedGp + roughPf2eGp) * 100) / 100;
  }

  static async #rerollGeneratedItem(app, index) {
    const item = app.editableLoot?.generatedItems?.[index];
    if (!item) return;

    const sourceType = item.flags?.["pf2e-loot-forge"]?.sourceType ?? "curiosity";
    const currentValue = Number(item.system?.price?.value?.gp ?? 0);
    const themeId = app.editableLoot?.themeProfile?.id ?? app.lastConfig?.theme ?? "generic";

    const replacement = await GeneratedTreasureFactory.generate({
      category: sourceType,
      themeId,
      valueBudget: currentValue
    });

    app.editableLoot.generatedItems[index] = replacement;
    app.editableLoot.totalValueGp = LootForgeApp.#estimateTotalValue(app.editableLoot);
    app.editableLoot.budgetDeltaGp = Math.round((app.editableLoot.totalValueGp - (app.editableLoot.budget?.targetGp ?? 0)) * 100) / 100;
  }

  static #removeGeneratedItem(app, index) {
    if (!app.editableLoot?.generatedItems) return;
    app.editableLoot.generatedItems.splice(index, 1);
    app.editableLoot.totalValueGp = LootForgeApp.#estimateTotalValue(app.editableLoot);
    app.editableLoot.budgetDeltaGp = Math.round((app.editableLoot.totalValueGp - (app.editableLoot.budget?.targetGp ?? 0)) * 100) / 100;
  }

  static #removePf2eItem(app, index) {
    if (!app.editableLoot) return;
    app.editableLoot.selectedRefs?.splice(index, 1);
    app.editableLoot.pf2eItems?.splice(index, 1);
    app.editableLoot.totalValueGp = LootForgeApp.#estimateTotalValue(app.editableLoot);
    app.editableLoot.budgetDeltaGp = Math.round((app.editableLoot.totalValueGp - (app.editableLoot.budget?.targetGp ?? 0)) * 100) / 100;
  }

  static async #onSubmit(event, form, formData) {
    event.preventDefault();

    const app = foundry.applications.instances.get("pf2e-loot-forge-app");
    const data = formData.object;
    const action = event.submitter?.dataset?.action ?? "generate";

    const config = LootForgeApp.#configFromFormData(data);
    app.lastConfig = foundry.utils.deepClone(config);
    app.targetActorId = data.targetActorId ?? null;
    LootForgeApp.#syncEditsFromForm(app, data);

    if (action?.startsWith("reroll-generated:")) {
      const index = Number(action.split(":")[1]);
      await LootForgeApp.#rerollGeneratedItem(app, index);
      app.render({ force: true });
      return;
    }

    if (action?.startsWith("remove-generated:")) {
      const index = Number(action.split(":")[1]);
      LootForgeApp.#removeGeneratedItem(app, index);
      app.render({ force: true });
      return;
    }

    if (action?.startsWith("remove-pf2e:")) {
      const index = Number(action.split(":")[1]);
      LootForgeApp.#removePf2eItem(app, index);
      app.render({ force: true });
      return;
    }

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

      await LootForgeAPI.addLootToActor(actor, app.editableLoot ?? app.result, { mystifyMagicItems: config.mystifyMagicItems });
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
    app.editableLoot = foundry.utils.deepClone(app.result);
    app.lastConfig = foundry.utils.deepClone(config);
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
      lootStyle: Number(data.lootStyle ?? 50),
      includeCombatGear: Boolean(data.includeCombatGear),
      includeConsumables: Boolean(data.includeConsumables),
      includePermanentItems: Boolean(data.includePermanentItems),
      includeValuables: Boolean(data.includeValuables),
      includeCuriosities: Boolean(data.includeCuriosities),
      mystifyMagicItems: Boolean(data.mystifyMagicItems)
    };
  }
}
