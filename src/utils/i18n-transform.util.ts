import { I18N_DEFAULT_LANGUAGE } from '../config';

export function convertToLanguage<T>(language: string, doc: T, populate?: string[]): T {
  const item: any = { ...doc };
  if (language && language !== I18N_DEFAULT_LANGUAGE) {
    if (item._translations?.[language]) {
      Object.assign(item, item._translations[language]);
      item._translated = true;
    } else {
      item._translated = false;
    }
  }
  if (Array.isArray(populate))
    convertPopulate<T>(language, item, populate);
  item._translations = undefined;
  return item;
}

export function convertToLanguageArray<T>(language: string, doc: T[], populate?: string[]): T[] {
  const docs = [];
  for (let i = 0; i < doc.length; i++) {
    const item: any = { ...doc[i] };
    if (language && language !== I18N_DEFAULT_LANGUAGE) {
      if (item._translations?.[language]) {
        Object.assign(item, item._translations[language]);
        item._translated = true;
      } else {
        item._translated = false;
      }
    }
    if (Array.isArray(populate))
      convertPopulate<T>(language, item, populate);
    item._translations = undefined;
    docs.push(item);
  }
  return docs;
}

function convertPopulate<T>(language: string, item: any, populate: string[]) {
  for (let i = 0; i < populate.length; i++) {
    if (Array.isArray(item[populate[i]])) {
      for (let j = 0; j < item[populate[i]].length; j++) {
        if (language && language !== I18N_DEFAULT_LANGUAGE) {
          if (item[populate[i]][j]._translations?.[language]) {
            Object.assign(item[populate[i]][j], item[populate[i]][j]._translations[language]);
            item[populate[i]][j]._translated = true;
          }
        }
        item[populate[i]][j]._translations = undefined;
      }
    } else {
      if (language && language !== I18N_DEFAULT_LANGUAGE) {
        if (item[populate[i]]?._translations?.[language]) {
          Object.assign(item[populate[i]], item[populate[i]]._translations[language]);
          item[populate[i]]._translated = true;
        }
      }
      item[populate[i]]._translations = undefined;
    }
  }
}