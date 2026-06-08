import { ProceduralGenerator } from "./procedural-generator.js";

export class DocumentGenerator extends ProceduralGenerator {
  constructor() {
    super({
      category: "document",
      sourceType: "document",
      dataPath: "data/generators/documents.json"
    });
  }

  build(data, themeId) {
    const template = this.pickTemplate(data);
    const kind = this.pick(data.kinds, themeId);
    const subject = this.pick(data.subjects, themeId);
    const condition = this.pick(data.conditions, themeId);

    const values = {
      condition: this.localize(condition),
      kind: this.localize(kind),
      subject: this.localize(subject)
    };

    return {
      name: this.format(template, values),
      description: this.format("LF.Generated.Document.Description", values),
      valueMultiplier: this.combinedMultiplier(condition)
    };
  }
}
