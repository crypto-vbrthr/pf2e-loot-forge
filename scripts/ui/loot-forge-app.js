import { MODULE_ID } from "../constants.js";
import { LootForgeAPI } from "../api.js";
import { lfLocalize } from "../localization-helper.js";
import { EmbeddedLootForge } from "./embedded-loot-forge.js";

/**
 * Standalone Loot Forge window.
 *
 * The embedded editor owns generation and preview editing. This container owns
 * persistence/application actions such as applying loot to an Actor or creating
 * a new loot Actor.
 */
export class LootForgeApp extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "pf2e-loot-forge-app",
    tag: "section",
    window: { title: "PF2E Loot Forge", icon: "fa-solid fa-gem", resizable: true },
    position: { width: 1360, height: 900 }
  };

  static PARTS = {
    form: { template: `modules/${MODULE_ID}/templates/loot-forge-app.hbs` }
  };

  constructor(options = {}) {
    super(options);
    this.targetActorId = options.targetActorId ?? null;
    this.newLootActorName = options.newLootActorName ?? "Loot Forge Treasure";
    this.editor = options.editor ?? new EmbeddedLootForge({
      initialConfig: options.initialConfig ?? {},
      persistGenerationSettings: true,
      persistSourceSelection: true,
      onChange: () => this.#syncHostControls()
    });
  }

  async _prepareContext() {
    const actors = game.actors
      .filter(actor => actor.isOwner && ["loot", "character", "npc", "creature"].includes(actor.type))
      .map(actor => ({
        id: actor.id,
        name: actor.name,
        type: actor.type,
        typeLabel: actor.type === "loot"
          ? lfLocalize("LF.ActorType.Loot")
          : actor.type === "character"
            ? lfLocalize("LF.ActorType.Character")
            : lfLocalize("LF.ActorType.NPC"),
        isLoot: actor.type === "loot",
        selected: actor.id === this.targetActorId
      }))
      .sort((a, b) => {
        if (a.isLoot !== b.isLoot) return a.isLoot ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    return {
      actors,
      droppedTargetActor: this.targetActorId ? game.actors.get(this.targetActorId) : null,
      newLootActorName: this.newLootActorName,
      hasResult: this.editor.hasResult
    };
  }

  async _onRender(context, options) {
    super._onRender(context, options);

    const element = this.element;
    const embeddedHost = element.querySelector("[data-lf-embedded-host]");
    if (embeddedHost) await this.editor.render(embeddedHost);

    const actorSelect = element.querySelector('select[name="targetActorId"]');
    actorSelect?.addEventListener("change", event => {
      this.targetActorId = event.currentTarget.value || null;
    });

    const lootActorNameInput = element.querySelector('input[name="newLootActorName"]');
    lootActorNameInput?.addEventListener("input", event => {
      this.newLootActorName = event.currentTarget.value;
    });

    this.#wireActorDrop(element);

    element.querySelector('[data-action="apply"]')?.addEventListener("click", event => {
      event.preventDefault();
      this.#applyToActor();
    });

    element.querySelector('[data-action="create-loot-actor"]')?.addEventListener("click", event => {
      event.preventDefault();
      this.#createLootActor();
    });

    this.#syncHostControls();
  }

  async _onClose(options) {
    this.editor.destroy();
    return super._onClose(options);
  }

  #wireActorDrop(element) {
    const dropTarget = element.querySelector("[data-lf-target-actor-drop]");
    if (!dropTarget) return;

    dropTarget.addEventListener("dragover", event => {
      event.preventDefault();
      dropTarget.classList.add("lf-drop-target-active");
    });

    dropTarget.addEventListener("dragleave", () => {
      dropTarget.classList.remove("lf-drop-target-active");
    });

    dropTarget.addEventListener("drop", async event => {
      event.preventDefault();
      dropTarget.classList.remove("lf-drop-target-active");

      let data;
      try {
        data = JSON.parse(event.dataTransfer.getData("text/plain"));
      } catch (_error) {
        ui.notifications.warn(lfLocalize("LF.Notification.DropInvalid"));
        return;
      }

      let actor = null;

      if (data?.type === "Actor" || data?.documentName === "Actor") {
        const document = data.uuid ? await fromUuid(data.uuid) : game.actors.get(data.id);
        actor = document?.documentName === "Actor" ? document : null;
      } else if (data?.type === "Token" || data?.type === "TokenDocument" || data?.documentName === "Token") {
        const tokenDocument = data.uuid ? await fromUuid(data.uuid) : null;
        actor = tokenDocument?.actor ?? null;
      }

      if (!actor) {
        ui.notifications.warn(lfLocalize("LF.Notification.DropNoActor"));
        return;
      }

      this.targetActorId = actor.id;
      ui.notifications.info(lfLocalize("LF.Notification.DropActorSelected").replace("{actor}", actor.name));
      await this.render({ force: true });
    });
  }

  async #applyToActor() {
    this.editor.syncFromForm();
    const loot = this.editor.getLoot();

    if (!loot) {
      ui.notifications.warn(lfLocalize("LF.Notification.NoPreview"));
      return;
    }

    const actor = game.actors.get(this.targetActorId);
    if (!actor) {
      ui.notifications.warn(lfLocalize("LF.Notification.NoActor"));
      return;
    }

    const config = this.editor.getConfig();
    await LootForgeAPI.addLootToActor(actor, loot, { mystifyMagicItems: config.mystifyMagicItems });
  }

  async #createLootActor() {
    this.editor.syncFromForm();
    const loot = this.editor.getLoot();

    if (!loot) {
      ui.notifications.warn(lfLocalize("LF.Notification.NoPreview"));
      return;
    }

    const input = this.element.querySelector('input[name="newLootActorName"]');
    this.newLootActorName = input?.value ?? this.newLootActorName;
    await LootForgeAPI.createLootActorWithLoot(this.newLootActorName, loot);
  }

  #syncHostControls() {
    const element = this.element;
    if (!element) return;

    const disabled = !this.editor.hasResult;
    element.querySelectorAll('[data-action="apply"], [data-action="create-loot-actor"]').forEach(button => {
      button.disabled = disabled;
    });
  }
}
