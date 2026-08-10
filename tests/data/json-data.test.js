import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function jsonFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) files.push(...jsonFiles(path));
    else if (path.endsWith(".json")) files.push(path);
  }
  return files;
}

for (const file of jsonFiles("data")) {
  test(`${file} is valid JSON`, () => {
    assert.doesNotThrow(() => JSON.parse(readFileSync(file, "utf8")));
  });
}
