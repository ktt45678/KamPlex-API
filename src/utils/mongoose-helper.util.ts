import { BSONSerializeOptions } from 'mongodb';
import * as mongoBson from 'mongodb/lib/bson.js';

export function calculatePageSkip(page: number, limit: number) {
  return (!page || !limit) ? 0 : limit * (page - 1);
}

export function convertToMongooseSort(sortSubject: string, sortEnum?: string[], parent?: string) {
  if (!sortSubject)
    return undefined;
  const query = {};
  const items = sortSubject.match(/(?:asc|desc)\(\S*?\)/g);
  if (!items?.length)
    return undefined;
  if (sortEnum?.length) {
    for (let i = 0; i < items.length; i++) {
      if (items[i].startsWith('asc(') && items[i].endsWith(')')) {
        const subItems = items[i].substring(4, items[i].length - 1).split(',');
        for (let j = 0; j < subItems.length; j++) {
          if (sortEnum.includes(subItems[j]))
            query[parent ? `${parent}.${subItems[j]}` : subItems[j]] = 1;
        }
      } else if (items[i].startsWith('desc(') && items[i].endsWith(')')) {
        const subItems = items[i].substring(5, items[i].length - 1).split(',');
        for (let j = 0; j < subItems.length; j++)
          if (sortEnum.includes(subItems[j]))
            query[parent ? `${parent}.${subItems[j]}` : subItems[j]] = -1;
      }
    }
  } else {
    for (let i = 0; i < items.length; i++) {
      if (items[i].startsWith('asc(') && items[i].endsWith(')')) {
        const subItems = items[i].substring(4, items[i].length - 1).split(',');
        for (let j = 0; j < subItems.length; j++)
          query[parent ? `${parent}.${subItems[j]}` : subItems[j]] = 1;
      } else if (items[i].startsWith('desc(') && items[i].endsWith(')')) {
        const subItems = items[i].substring(5, items[i].length - 1).split(',');
        for (let j = 0; j < subItems.length; j++)
          query[parent ? `${parent}.${subItems[j]}` : subItems[j]] = -1;
      }
    }
  }
  return query;
}

export function convertToMongooseFields(fieldSubject: string) {
  if (!fieldSubject)
    return undefined;
  const fields = {};
  const fieldType = fieldSubject.startsWith('incl:') ? 1 : fieldSubject.startsWith('excl:') ? 0 : -1;
  if (fieldType === -1)
    return undefined;
  const fieldList = uniqString(fieldSubject.substring(5).split(','));
  let i = fieldList.length;
  while (i--)
    fields[fieldList[i]] = fieldType;
  return fields;
}

function uniqString(array) {
  array = array.sort();
  let i = 0;
  while (i < array.length) {
    let j = i + 1;
    while (j < array.length)
      if (array[j].startsWith(array[i]))
        array.splice(j, 1);
      else
        j++;
    i++;
  }
  return array;
}

export function applyMongoDBPatches() {
  BigInt.prototype['toJSON'] = function () { return this.toString() };
  mongoBson['resolveBSONOptions'] = function (
    options?: BSONSerializeOptions,
    parent?: { bsonOptions?: BSONSerializeOptions }
  ): BSONSerializeOptions {
    const parentOptions = parent?.bsonOptions;
    return {
      raw: options?.raw ?? parentOptions?.raw ?? false,
      useBigInt64: options?.useBigInt64 ?? parentOptions?.useBigInt64 ?? true,
      promoteLongs: options?.promoteLongs ?? parentOptions?.promoteLongs ?? true,
      promoteValues: options?.promoteValues ?? parentOptions?.promoteValues ?? true,
      promoteBuffers: options?.promoteBuffers ?? parentOptions?.promoteBuffers ?? false,
      ignoreUndefined: options?.ignoreUndefined ?? parentOptions?.ignoreUndefined ?? false,
      bsonRegExp: options?.bsonRegExp ?? parentOptions?.bsonRegExp ?? false,
      serializeFunctions: options?.serializeFunctions ?? parentOptions?.serializeFunctions ?? false,
      fieldsAsRaw: options?.fieldsAsRaw ?? parentOptions?.fieldsAsRaw ?? {},
      enableUtf8Validation:
        options?.enableUtf8Validation ?? parentOptions?.enableUtf8Validation ?? true
    };
  }
}

export function applyBigIntPatches() {
  BigInt.prototype['toJSON'] = function () { return this.toString() };
}
