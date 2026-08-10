import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const embeddedTemplate = readFileSync("templates/embedded-loot-forge.hbs", "utf8");
const standaloneTemplate = readFileSync("templates/loot-forge-app.hbs", "utf8");
const embeddedSource = readFileSync("scripts/ui/embedded-loot-forge.js", "utf8");
const standaloneSource = readFileSync("scripts/ui/loot-forge-app.js", "utf8");

test("Generate remains an embedded-editor responsibility", () => {
  assert.match(embeddedTemplate, /data-action="generate"/);
  assert.doesNotMatch(standaloneTemplate, /data-action="generate"/);
});

test("Apply and Create Loot Actor remain container responsibilities", () => {
  assert.doesNotMatch(embeddedTemplate, /data-action="apply"/);
  assert.doesNotMatch(embeddedTemplate, /data-action="create-loot-actor"/);
  assert.match(standaloneTemplate, /data-action="apply"/);
  assert.match(standaloneTemplate, /data-action="create-loot-actor"/);
});

test("embedded editor is not coupled to persistence API operations", () => {
  assert.doesNotMatch(embeddedSource, /LootForgeAPI/);
  assert.doesNotMatch(embeddedSource, /addLootToActor/);
  assert.doesNotMatch(embeddedSource, /createLootActorWithLoot/);
  assert.match(standaloneSource, /new EmbeddedLootForge/);
});
