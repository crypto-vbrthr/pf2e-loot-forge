import { GENERATED_ITEM_IMAGE } from "../constants.js";
import { BeverageGenerator } from "./beverage-generator.js";
import { CuriosityGenerator } from "./curiosity-generator.js";
import { DocumentGenerator } from "./document-generator.js";
import { JewelryGenerator } from "./jewelry-generator.js";
import { PaintingGenerator } from "./painting-generator.js";
import { StatueGenerator } from "./statue-generator.js";

export class GeneratedTreasureFactory {
  static generators = {
    painting: new PaintingGenerator(),
    statue: new StatueGenerator(),
    jewelry: new JewelryGenerator(),
    beverage: new BeverageGenerator(),
    document: new DocumentGenerator(),
    curiosity: new CuriosityGenerator()
  };

  static async generate({ category, themeId, valueBudget }) {
    const generator = this.generators[category] ?? this.generators.curiosity;
    const generated = await generator.generate({ themeId, valueBudget });
    return this.toTreasureItem(generated);
  }

  static async generateAny({ allowedCategories = [], themeId, valueBudget }) {
    const categories = allowedCategories.length ? allowedCategories : Object.keys(this.generators);
    const category = categories[Math.floor(Math.random() * categories.length)];
    return this.generate({ category, themeId, valueBudget });
  }

  static toTreasureItem(generated) {
    return {
      name: generated.name,
      type: "treasure",
      img: GENERATED_ITEM_IMAGE,
      flags: {
        "pf2e-loot-forge": {
          sourceType: generated.sourceType
        }
      },
      system: {
        description: { value: `<p>${generated.description}</p>` },
        price: { value: { gp: generated.valueGp } },
        quantity: 1,
        bulk: { value: 0 },
        stackGroup: ""
      }
    };
  }
}
