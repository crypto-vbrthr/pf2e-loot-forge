import "../setup/foundry-mocks.js";

import test from "node:test";
import assert from "node:assert/strict";
import { gpToCoins, priceToGp } from "../../scripts/price-utils.js";
import { LootForgeAPI } from "../../scripts/api.js";

test("fractional GP values serialize to whole PF2e coin denominations before actor creation", () => {
  assert.deepEqual(gpToCoins(121.8), { gp: 121, sp: 8 });
  assert.equal(priceToGp({ gp: 121, sp: 8 }), 121.8);
});

test("actor application no longer rewrites valid item source prices", async () => {
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
    name: "Precise Treasure",
    type: "treasure",
    system: { price: { value: { gp: 121, sp: 8 }, per: 1 } }
  };
  await LootForgeAPI.addLootToActor(actor, { coins: {}, pf2eItems: [], generatedItems: [source] });
  assert.equal(createdData.length, 1);
  assert.deepEqual(createdData[0].system.price.value, { gp: 121, sp: 8 });
});
