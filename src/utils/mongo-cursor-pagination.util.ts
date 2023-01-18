import { PipelineStage } from 'mongoose';

import { createLookupPipeline, LookupOptions } from './mongo-offset-pagination.util';
import { convertToMongooseSort } from './mongoose-helper.util';
import { isEmptyObject } from './object-helper.util';

export class MongooseCursorPagination {
  pageToken?: string;
  limit?: number = 30;
  search?: string;
  filters?: { [key: string]: any } = {};
  sortQuery?: string;
  sortEnum?: string[];
  fullTextSearch?: boolean = false;
  fields?: { [key: string]: any };
  sort?: { [key: string]: any };

  constructor(partial: Partial<MongooseCursorPagination>) {
    Object.assign(this, partial);
  }

  build() {
    let sortTarget: string;
    let sortDirection: number;
    const sortValue = convertToMongooseSort(this.sortQuery, this.sortEnum);
    if (!isEmptyObject(sortValue)) this.sort = sortValue;
    if (!isEmptyObject(this.sort)) {
      const firstSortKey = Object.keys(this.sort)[0];
      sortTarget = firstSortKey;
      sortDirection = this.sort[firstSortKey];
    }
    const aggregation: PipelineStage[] = [];
    (this.search && this.fullTextSearch) && (this.filters.$text = { $search: this.search });
    !isEmptyObject(this.filters) && aggregation.push({ $match: this.filters });
    !isEmptyObject(this.sort) && aggregation.push({ $sort: this.sort });
    if (this.pageToken) {
      const [navType, pageValue] = parsePageToken(this.pageToken);
      const pagingQuery = getPageQuery(pageValue, navType, sortDirection, sortTarget);
      aggregation.push({ $match: { $expr: pagingQuery } });
    }
    aggregation.push({ $limit: this.limit });
    !isEmptyObject(this.fields) && aggregation.push({ $project: this.fields });
    aggregation.push(
      { $group: { _id: null, results: { $push: '$$ROOT' } } },
      {
        $project: {
          _id: 0, results: 1,
          nextPageToken: [1, { $last: '$results.' + sortTarget }],
          prevPageToken: [-1, { $first: '$results.' + sortTarget }]
        }
      }
    );
    return aggregation;
  }

  buildLookup(lookups: LookupOptions[]) {
    let sortTarget: string;
    let sortDirection: number;
    const sortValue = convertToMongooseSort(this.sortQuery, this.sortEnum);
    if (!isEmptyObject(sortValue)) this.sort = sortValue;
    if (!isEmptyObject(this.sort)) {
      const firstSortKey = Object.keys(this.sort)[0];
      sortTarget = firstSortKey;
      sortDirection = this.sort[firstSortKey];
    }
    const aggregation: PipelineStage[] = [];
    (this.search && this.fullTextSearch) && (this.filters.$text = { $search: this.search });
    !isEmptyObject(this.filters) && aggregation.push({ $match: this.filters });
    !isEmptyObject(this.sort) && aggregation.push({ $sort: this.sort });
    if (this.pageToken) {
      const [navType, pageValue] = parsePageToken(this.pageToken);
      const pagingQuery = getPageQuery(pageValue, navType, sortDirection, sortTarget);
      aggregation.push({ $match: { $expr: pagingQuery } });
    }
    aggregation.push({ $limit: this.limit });
    !isEmptyObject(this.fields) && aggregation.push({ $project: this.fields });
    const lookupPipelines = createLookupPipeline(lookups);
    aggregation.push(...lookupPipelines);
    aggregation.push(
      { $group: { _id: null, results: { $push: '$$ROOT' } } },
      {
        $project: {
          _id: 0, results: 1,
          nextPageToken: [1, { $last: '$results.' + sortTarget }],
          prevPageToken: [-1, { $first: '$results.' + sortTarget }]
        }
      }
    );
    return aggregation;
  }

  buildLookupOnly(id: string, lookup: LookupOptions) {
    return [];
  }

  private createLookupOnlyPipeline(lookup: LookupOptions) {
    return [];
  }

  toObject() {
    const sortValue = convertToMongooseSort(this.sortQuery, this.sortEnum);
    if (!isEmptyObject(sortValue)) this.sort = sortValue;
    return {
      limit: this.limit,
      search: this.search,
      filters: this.filters,
      fields: this.fields,
      sort: this.sort,
      fullTextSearch: this.fullTextSearch
    };
  }

  toJson() {
    return JSON.stringify(this.toObject());
  }
}

export function getPageQuery(value: string | number, navType: number, sortDirection: number, sortTarget: string) {
  const convertQuery = [`$${sortTarget}`, { $convert: { input: value, to: { $type: `$${sortTarget}` }, onError: null } }];
  if (navType === 1) { // Next page
    if (sortDirection === 1) { // Asc
      return { $gt: convertQuery }
    } else { // Desc
      return { $lt: convertQuery }
    }
  } else { // Previous page
    if (sortDirection === 1) { // Asc
      return { $lt: convertQuery }
    } else { // Desc
      return { $gt: convertQuery }
    }
  }
}

export function parsePageToken(pageToken: string) {
  const tokenJson = Buffer.from(pageToken, 'base64url').toString();
  let tokenData: [number, string];
  try {
    tokenData = JSON.parse(tokenJson);
  } catch {
    return null;
  }
  if (!Array.isArray(tokenData) || tokenData.length !== 2) return null;
  const [navType] = tokenData;
  if (![-1, 1].includes(navType)) return null;
  return tokenData;
}

export function tokenDataToPageToken(tokenData: [number, string]) {
  const tokenJson = JSON.stringify(tokenData);
  return Buffer.from(tokenJson).toString('base64url');
}
