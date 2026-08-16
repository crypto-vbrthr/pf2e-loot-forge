import "../setup/foundry-mocks.js";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { LootForgeAPI } from "../../scripts/api.js";

test("generic embedded editors do not persist standalone generation defaults unless requested", () => {
  const editor = LootForgeAPI.createEmbeddedEditor();
  assert.equal(editor.persistGenerationSettings, false);
  assert.equal(editor.persistSourceSelection, false);
  assert.equal(editor.getState().sourceSelectionScope, "host");

  const persistentEditor = LootForgeAPI.createEmbeddedEditor({ persistGenerationSettings: true, persistSourceSelection: true });
  assert.equal(persistentEditor.persistGenerationSettings, true);
  assert.equal(persistentEditor.persistSourceSelection, true);
  assert.equal(persistentEditor.getState().sourceSelectionScope, "world");
});

test("embedded compendium selection is host-local by default", async () => {
  await game.settings.set("pf2e-loot-forge", "enabledCompendiums", ["world.default"]);

  const editor = LootForgeAPI.createEmbeddedEditor({
    initialConfig: { compendiums: ["host.alpha", "host.beta"] }
  });

  assert.deepEqual(editor.getCompendiums(), ["host.alpha", "host.beta"]);
  await editor.setCompendiums(["host.gamma"], { render: false });

  assert.deepEqual(editor.getCompendiums(), ["host.gamma"]);
  assert.deepEqual(game.settings.get("pf2e-loot-forge", "enabledCompendiums"), ["world.default"]);
});

test("embedded compendium selection can explicitly persist to world settings", async () => {
  await game.settings.set("pf2e-loot-forge", "enabledCompendiums", ["world.default"]);

  const editor = LootForgeAPI.createEmbeddedEditor({ persistSourceSelection: true });
  await editor.setCompendiums(["world.changed"], { render: false });

  assert.deepEqual(game.settings.get("pf2e-loot-forge", "enabledCompendiums"), ["world.changed"]);
});

test("standalone container opts into remembered generation settings", () => {
  const source = fs.readFileSync(new URL("../../scripts/ui/loot-forge-app.js", import.meta.url), "utf8");
  assert.match(source, /persistGenerationSettings:\s*true/);
  assert.match(source, /persistSourceSelection:\s*true/);
  assert.match(source, /width:\s*1360/);
  assert.match(source, /height:\s*900/);
});
