import { MODULE_ID } from "./constants.js";
import { registerSettings } from "./settings.js";
import { LootForgeAPI } from "./api.js";
import { LootForgeApp } from "./ui/loot-forge-app.js";
import { lfLocalize, registerLocalizationHelpers } from "./localization-helper.js";

Hooks.once("init", () => {
  console.log("PF2E Loot Forge | Initializing");
  registerLocalizationHelpers();
  registerSettings();

  const module = game.modules.get(MODULE_ID);
  if (module) module.api = LootForgeAPI;
});

Hooks.once("ready", () => {
  console.log("PF2E Loot Forge | Ready");
});

Hooks.on("renderActorDirectory", (_app, html) => {
  if (!game.user.isGM) return;

  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;
  if (root.querySelector(".pf2e-loot-forge-directory-button")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.classList.add("pf2e-loot-forge-directory-button");
  button.innerHTML = `<i class="fa-solid fa-gem"></i> ${lfLocalize("LF.Controls.Open")}`;
  button.addEventListener("click", () => new LootForgeApp().render(true));

  const footer = root.querySelector(".directory-footer");
  if (footer) {
    footer.appendChild(button);
    return;
  }

  const header = root.querySelector(".directory-header");
  if (header) {
    const wrapper = document.createElement("div");
    wrapper.classList.add("pf2e-loot-forge-directory-wrapper");
    wrapper.appendChild(button);
    header.appendChild(wrapper);
  }
});


function pf2eLootForgeRoot(html) {
  if (html instanceof HTMLElement) return html;
  if (html?.[0] instanceof HTMLElement) return html[0];
  if (html?.element instanceof HTMLElement) return html.element;
  return document;
}

function pf2eLootForgeCreateButton() {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "pf2e-loot-forge-directory-button";
  button.innerHTML = '<i class="fa-solid fa-coins"></i> Loot Forge';
  button.addEventListener("click", event => {
    event.preventDefault();
    new LootForgeApp().render(true);
  });
  return button;
}

function pf2eLootForgeInjectActorButton(html, source = "unknown") {
  try {
    const root = pf2eLootForgeRoot(html);
    const actorDirectory =
      root?.id === "actors" ? root :
      root?.querySelector?.("#actors") ??
      document.querySelector("#actors");

    if (!actorDirectory) return false;
    if (actorDirectory.querySelector(".pf2e-loot-forge-directory-button")) return true;

    const target =
      actorDirectory.querySelector(".directory-header") ??
      actorDirectory.querySelector(".header-actions") ??
      actorDirectory.querySelector(".directory-list") ??
      actorDirectory;

    if (!target) return false;

    const wrapper = document.createElement("div");
    wrapper.className = "pf2e-loot-forge-directory-wrapper";
    wrapper.dataset.source = source;
    wrapper.append(pf2eLootForgeCreateButton());

    if (target.classList?.contains("directory-list")) target.before(wrapper);
    else target.append(wrapper);

    console.log("PF2E Loot Forge | Actor sidebar button injected via", source);
    return true;
  } catch (error) {
    console.error("PF2E Loot Forge | Failed to inject actor sidebar button", error);
    return false;
  }
}

Hooks.on("renderActorDirectory", (_app, html) => {
  pf2eLootForgeInjectActorButton(html, "renderActorDirectory");
});

Hooks.on("renderSidebarTab", (app, html) => {
  if (app?.id !== "actors" && app?.tabName !== "actors") return;
  pf2eLootForgeInjectActorButton(html, "renderSidebarTab");
});

Hooks.once("ready", () => {
  setTimeout(() => pf2eLootForgeInjectActorButton(document, "ready-timeout"), 250);
});
