import "../setup/foundry-mocks.js";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { LootForgeAPI } from "../../scripts/api.js";

test("generic embedded editors do not persist standalone generation defaults unless requested", () => {
  const editor = LootForgeAPI.createEmbeddedEditor();
  assert.equal(editor.persistGenerationSettings, false);

  const persistentEditor = LootForgeAPI.createEmbeddedEditor({ persistGenerationSettings: true });
  assert.equal(persistentEditor.persistGenerationSettings, true);
});

test("standalone container opts into remembered generation settings", () => {
  const source = fs.readFileSync(new URL("../../scripts/ui/loot-forge-app.js", import.meta.url), "utf8");
  assert.match(source, /persistGenerationSettings:\s*true/);
  assert.match(source, /width:\s*1360/);
  assert.match(source, /height:\s*900/);
});
