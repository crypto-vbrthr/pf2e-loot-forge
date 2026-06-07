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
