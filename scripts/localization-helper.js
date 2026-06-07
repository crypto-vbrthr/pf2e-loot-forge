import { LF_TRANSLATIONS } from "./i18n-data.js";

function getLanguage() {
  const lang = game?.i18n?.lang ?? "en";
  return LF_TRANSLATIONS[lang] ? lang : "en";
}

export function lfLocalize(key) {
  const foundryValue = game?.i18n?.localize?.(key);
  if (foundryValue && foundryValue !== key) return foundryValue;
  const lang = getLanguage();
  return LF_TRANSLATIONS[lang]?.[key] ?? LF_TRANSLATIONS.en?.[key] ?? key;
}

export function lfFormat(key, data = {}) {
  let template = lfLocalize(key);
  for (const [token, value] of Object.entries(data)) {
    template = template.replaceAll(`{${token}}`, value);
  }
  return template;
}

export function registerLocalizationHelpers() {
  Handlebars.registerHelper("lf", function (key, options) {
    const hash = options?.hash ?? {};
    if (Object.keys(hash).length) return lfFormat(key, hash);
    return lfLocalize(key);
  });
}
