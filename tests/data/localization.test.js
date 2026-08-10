import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir, extensions) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) files.push(...walk(path, extensions));
    else if (extensions.some(ext => path.endsWith(ext))) files.push(path);
  }
  return files;
}

const sources = [
  ...walk("scripts", [".js"]),
  ...walk("templates", [".hbs"]),
  ...walk("data", [".json"])
];

const literalKeys = new Set();
for (const file of sources) {
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(/LF\.[A-Za-z0-9_.-]+/g)) {
    const key = match[0].replace(/[.-]+$/, "");
    if (key.split(".").length >= 3) literalKeys.add(key);
  }
}

for (const lang of ["de", "en"]) {
  test(`all literal LF localization keys exist in ${lang}.json`, () => {
    const translations = JSON.parse(readFileSync(`lang/${lang}.json`, "utf8"));
    const missing = [...literalKeys].filter(key => !Object.hasOwn(translations, key));
    assert.deepEqual(missing, []);
  });
}
