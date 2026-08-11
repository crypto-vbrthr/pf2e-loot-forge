import test from "node:test";
import assert from "node:assert/strict";
import { LootForgeAPI } from "../../scripts/api.js";

test("embedded API exposes a versioned editor factory", () => {
  assert.equal(LootForgeAPI.embeddedContractVersion, 1);
  assert.equal(typeof LootForgeAPI.createEmbeddedEditor, "function");
  assert.equal(typeof LootForgeAPI.getItemForgeIntegrationStatus, "function");
});

test("embedded editor excludes host persistence actions", () => {
  const editor = LootForgeAPI.createEmbeddedEditor();

  for (const method of ["render", "refresh", "getConfig", "setConfig", "getState", "getLoot", "getGeneratedResult", "syncFromForm", "generate", "destroy"]) {
    assert.equal(typeof editor[method], "function", method);
  }

  assert.equal(editor.applyToActor, undefined);
  assert.equal(editor.addLootToActor, undefined);
  assert.equal(editor.createLootActor, undefined);
  assert.equal(editor.createLootActorWithLoot, undefined);

  assert.equal(typeof LootForgeAPI.addLootToActor, "function");
  assert.equal(typeof LootForgeAPI.createLootActorWithLoot, "function");
});
