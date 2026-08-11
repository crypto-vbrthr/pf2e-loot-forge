import "../setup/foundry-mocks.js";
import test from "node:test";
import assert from "node:assert/strict";
import { TreasureBudget } from "../../scripts/treasure-budget.js";

const profile = {
  id: "test",
  name: "Test",
  budgetMultiplier: 1,
  budgetsGp: { "10": 175 },
  categoryWeights: {}
};

test("fixed budget overrides calculated level and party budget exactly", async () => {
  const budget = await TreasureBudget.calculate({
    level: 10,
    partySize: 8,
    treasureProfile: "hoard",
    treasureBudgetProfile: profile,
    useFixedBudget: true,
    fixedBudgetGp: 121.8
  });

  assert.equal(budget.mode, "fixed");
  assert.equal(budget.targetGp, 121.8);
  assert.equal(budget.fixedBudgetGp, 121.8);
  assert.notEqual(budget.calculatedTargetGp, budget.targetGp);
});

test("disabled fixed budget keeps the existing calculated budget path", async () => {
  const budget = await TreasureBudget.calculate({
    level: 10,
    partySize: 4,
    treasureProfile: "standard",
    treasureBudgetProfile: profile,
    useFixedBudget: false,
    fixedBudgetGp: 999
  });

  assert.equal(budget.mode, "calculated");
  assert.equal(budget.targetGp, 175);
  assert.equal(budget.fixedBudgetGp, 0);
});

test("invalid fixed budget safely falls back to calculated budget", async () => {
  const budget = await TreasureBudget.calculate({
    level: 10,
    partySize: 4,
    treasureProfile: "standard",
    treasureBudgetProfile: profile,
    useFixedBudget: true,
    fixedBudgetGp: 0
  });

  assert.equal(budget.mode, "calculated");
  assert.equal(budget.targetGp, 175);
});
