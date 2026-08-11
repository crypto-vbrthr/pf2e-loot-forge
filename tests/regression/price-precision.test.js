import "../setup/foundry-mocks.js";

import test from "node:test";
import assert from "node:assert/strict";
import { LootForgeAPI } from "../../scripts/api.js";

test("actor application preserves item source prices instead of rewriting them", async () => {
  let createdData = null;
  const actor = {
    name: "Test Loot",
    system: { currency: {} },
    update: async () => {},
    createEmbeddedDocuments: async (_type, data) => {
      createdData = structuredClone(data);
      return data;
    }
  };

  const source = {
    name: "Legacy Fractional Source",
    type: "treasure",
    system: { price: { value: { gp: 121.8 } } }
  };

  await LootForgeAPI.addLootToActor(actor, {
    coins: {},
    pf2eItems: [],
    generatedItems: [source]
  });

  assert.deepEqual(createdData[0].system.price.value, { gp: 121.8 });
  assert.deepEqual(source.system.price.value, { gp: 121.8 });
});

test("existing whole-denomination PF2e prices are not rewritten", async () => {
  let createdData = null;
  const actor = {
    name: "Test Loot",
    system: { currency: {} },
    update: async () => {},
    createEmbeddedDocuments: async (_type, data) => {
      createdData = structuredClone(data);
      return data;
    }
  };

  await LootForgeAPI.addLootToActor(actor, {
    coins: {},
    pf2eItems: [{
      name: "Existing Item",
      type: "equipment",
      system: { price: { value: { gp: 12, sp: 5 } } }
    }],
    generatedItems: []
  });

  assert.deepEqual(createdData[0].system.price.value, { gp: 12, sp: 5 });
});
