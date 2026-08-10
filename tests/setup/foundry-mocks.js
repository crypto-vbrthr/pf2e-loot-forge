const clone = value => value === undefined ? undefined : structuredClone(value);
const merge = (base, update) => ({ ...clone(base), ...clone(update) });

class MockApplicationV2 {
  constructor(options = {}) {
    this.options = options;
    this.element = null;
  }
  render() { return Promise.resolve(this); }
  _onRender() {}
  _onClose() {}
}

const settings = new Map([
  ["pf2e-loot-forge.defaultRarity", "common"],
  ["pf2e-loot-forge.mystifyMagicItems", false],
  ["pf2e-loot-forge.enabledCompendiums", []],
  ["pf2e-loot-forge.includeGeneratedValuables", true],
  ["pf2e-loot-forge.allowCursedZeroValueItems", false]
]);

globalThis.foundry = {
  utils: {
    deepClone: clone,
    mergeObject: (base, update) => merge(base, update)
  },
  applications: {
    api: {
      ApplicationV2: MockApplicationV2,
      HandlebarsApplicationMixin: Base => Base
    },
    handlebars: {
      renderTemplate: async () => "<form></form>"
    },
    instances: new Map()
  }
};

globalThis.game = {
  i18n: {
    lang: "en",
    localize: key => key
  },
  settings: {
    get: (moduleId, key) => settings.get(`${moduleId}.${key}`),
    set: async (moduleId, key, value) => {
      settings.set(`${moduleId}.${key}`, clone(value));
      return value;
    }
  },
  packs: [],
  actors: []
};

globalThis.ui = {
  notifications: {
    info: () => {},
    warn: () => {},
    error: () => {}
  }
};

globalThis.fromUuid = async () => null;
globalThis.Actor = { create: async () => null };
globalThis.Handlebars = { registerHelper: () => {} };
