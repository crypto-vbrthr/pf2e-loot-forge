import { MODULE_ID } from "./constants.js";
import { CompendiumScanner } from "./compendium-scanner.js";
import { lfLocalize } from "./localization-helper.js";

export function registerSettings() {
  game.settings.register(MODULE_ID, "enabledCompendiums", {
    name: lfLocalize("LF.Settings.EnabledCompendiums.Name"),
    hint: lfLocalize("LF.Settings.EnabledCompendiums.Hint"),
    scope: "world",
    config: false,
    type: Array,
    default: []
  });

  game.settings.register(MODULE_ID, "defaultRarity", {
    name: lfLocalize("LF.Settings.DefaultRarity.Name"),
    hint: lfLocalize("LF.Settings.DefaultRarity.Hint"),
    scope: "world",
    config: true,
    type: String,
    choices: {
      common: lfLocalize("LF.Rarity.Common"),
      uncommon: lfLocalize("LF.Rarity.Uncommon"),
      rare: lfLocalize("LF.Rarity.Rare"),
      unique: lfLocalize("LF.Rarity.Unique")
    },
    default: "common"
  });

  game.settings.register(MODULE_ID, "includeGeneratedValuables", {
    name: lfLocalize("LF.Settings.IncludeGeneratedValuables.Name"),
    hint: lfLocalize("LF.Settings.IncludeGeneratedValuables.Hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });


  game.settings.register(MODULE_ID, "mystifyMagicItems", {
    name: lfLocalize("LF.Settings.MystifyMagicItems.Name"),
    hint: lfLocalize("LF.Settings.MystifyMagicItems.Hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  
  game.settings.register(MODULE_ID, "allowCursedZeroValueItems", {
    name: lfLocalize("LF.Settings.AllowCursedZeroValueItems.Name"),
    hint: lfLocalize("LF.Settings.AllowCursedZeroValueItems.Hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

game.settings.registerMenu(MODULE_ID, "compendiumSources", {
    name: lfLocalize("LF.Settings.CompendiumSources.Name"),
    label: lfLocalize("LF.Settings.CompendiumSources.Label"),
    hint: lfLocalize("LF.Settings.CompendiumSources.Hint"),
    icon: "fa-solid fa-book-atlas",
    type: LootForgeCompendiumSourcesConfig,
    restricted: true
  });
}

export class LootForgeCompendiumSourcesConfig extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "pf2e-loot-forge-compendiums",
      title: lfLocalize("LF.Settings.CompendiumSources.Title"),
      template: `modules/${MODULE_ID}/templates/compendium-sources.hbs`,
      width: 620,
      height: "auto",
      closeOnSubmit: true
    });
  }

  async getData() {
    const enabled = new Set(game.settings.get(MODULE_ID, "enabledCompendiums") ?? []);
    const packs = CompendiumScanner.getAvailableItemPacks().map(pack => ({
      collection: pack.collection,
      label: pack.metadata.label ?? pack.collection,
      packageName: pack.metadata.packageName ?? pack.metadata.package ?? "",
      checked: enabled.has(pack.collection)
    }));

    return { packs };
  }

  async _updateObject(_event, formData) {
    const enabled = Object.entries(formData)
      .filter(([key, value]) => key.startsWith("pack.") && value)
      .map(([key]) => key.replace(/^pack\./, ""));
    await game.settings.set(MODULE_ID, "enabledCompendiums", enabled);
  }
}
