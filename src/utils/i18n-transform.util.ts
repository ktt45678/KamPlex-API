import { I18N_DEFAULT_LANGUAGE, I18N_LANGUAGES } from '../config';

export function convertToLanguage<T>(language: string, doc: T, options?: I18nOptions): T {
  if (!I18N_LANGUAGES.includes(language))
    language = I18N_DEFAULT_LANGUAGE;
  options = { ...defaultI18nOptions, ...options };
  const item: any = { ...doc };
  if (!options.ignoreRoot && language && language !== I18N_DEFAULT_LANGUAGE) {
    if (item._translations?.[language]) {
      Object.assign(item, item._translations[language]);
      item._translated = true;
    } else {
      item._translated = false;
    }
  }
  if (Array.isArray(options.populate))
    convertPopulate<T>(language, item, options.populate);
  item._translations = undefined;
  return item;
}

export function convertToLanguageArray<T>(language: string, doc: T[], options?: I18nOptions): T[] {
  if (!I18N_LANGUAGES.includes(language))
    language = I18N_DEFAULT_LANGUAGE;
  options = { ...defaultI18nOptions, ...options };
  const docs = [];
  for (let i = 0; i < doc.length; i++) {
    const item: any = { ...doc[i] };
    if (!options.ignoreRoot && language && language !== I18N_DEFAULT_LANGUAGE) {
      if (item._translations?.[language]) {
        Object.assign(item, item._translations[language]);
        item._translated = true;
      } else {
        item._translated = false;
      }
    }
    if (Array.isArray(options.populate))
      convertPopulate<T>(language, item, options.populate);
    item._translations = undefined;
    docs.push(item);
  }
  return docs;
}

function convertPopulate<T>(language: string, item: any, populate: string[]) {
  for (let i = 0; i < populate.length; i++) {
    const subItem = deepProperties(item, populate[i]);
    if (Array.isArray(subItem)) {
      for (let j = 0; j < subItem.length; j++) {
        if (language && language !== I18N_DEFAULT_LANGUAGE) {
          if (subItem[j]._translations?.[language]) {
            Object.assign(subItem[j], subItem[j]._translations[language]);
            subItem[j]._translated = true;
          }
        }
        subItem[j]._translations = undefined;
      }
    } else if (subItem) {
      if (language && language !== I18N_DEFAULT_LANGUAGE) {
        if (subItem?._translations?.[language]) {
          Object.assign(subItem, subItem._translations[language]);
          subItem._translated = true;
        }
      }
      subItem._translations = undefined;
    }
  }
}

function deepProperties(item: any, value: string) {
  const parts = value.split('.');
  if (!value || parts.length <= 1)
    return item[value];
  let subItem = item;
  for (let i = 0; i < parts.length; i++) {
    subItem = subItem[parts[i]];
    if (!subItem)
      break;
  }
  return subItem;
}

export class I18nOptions {
  populate?: string[];
  ignoreRoot?: boolean;
}

const defaultI18nOptions: I18nOptions = {
  populate: [],
  ignoreRoot: false
};