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
    let sortDirection: 1 | -1;
    const sortValue = convertToMongooseSort(this.sortQuery, this.sortEnum);
    if (!isEmptyObject(sortValue)) this.sort = sortValue;
    if (!isEmptyObject(this.sort)) {
      const firstSortKey = Object.keys(this.sort)[0];
      sortTarget = firstSortKey;
      sortDirection = this.sort[firstSortKey];
    }
    const facet: PipelineStage.Facet['$facet'] = {
      stage1: [{ $group: { _id: null, count: { $sum: 1 } } }],
      stage2: [{ $limit: this.limit + 1 }]
    };
    let navType: number = 1;
    let pageValue: string;
    if (this.pageToken) {
      [navType, pageValue] = parsePageToken(this.pageToken);
      const pagingQuery = getPageQuery(pageValue, navType, sortDirection, sortTarget);
      facet.stage2.unshift({ $match: { $expr: pagingQuery } });
    }
    const aggregation: PipelineStage[] = [];
    (this.search && this.fullTextSearch) && (this.filters.$text = { $search: this.search });
    !isEmptyObject(this.filters) && aggregation.push({ $match: this.filters });
    // Sort results depend on navigation type (next page, previous page)
    const targetSortDirection = navType === 1 ? sortDirection : <1 | -1>(sortDirection * -1);
    !isEmptyObject(this.sort) && aggregation.push({ $sort: { [sortTarget]: targetSortDirection } });
    !isEmptyObject(this.fields) && facet.stage2.push({ $project: this.fields });
    aggregation.push({ $facet: facet });
    // Query result depend on navigation type
    const resultQuery = navType === 1 ? { $slice: ['$stage2', this.limit] } : { $reverseArray: { $slice: ['$stage2', this.limit] } };
    aggregation.push(
      { $unwind: '$stage1' },
      {
        $project: {
          _id: 0,
          totalResults: '$stage1.count',
          results: resultQuery,
          hasNextPage: { $gt: [{ $size: '$stage2' }, this.limit] }
        }
      },
      {
        $addFields: {
          nextPageToken: [1, { $last: '$results.' + sortTarget }],
          prevPageToken: [-1, { $first: '$results.' + sortTarget }]
        }
      }
    );
    return aggregation;
  }

  buildLookup(lookups: LookupOptions[]) {
    let sortTarget: string;
    let sortDirection: 1 | -1;
    const sortValue = convertToMongooseSort(this.sortQuery, this.sortEnum);
    if (!isEmptyObject(sortValue)) this.sort = sortValue;
    if (!isEmptyObject(this.sort)) {
      const firstSortKey = Object.keys(this.sort)[0];
      sortTarget = firstSortKey;
      sortDirection = this.sort[firstSortKey];
    }
    const lookupPipelines = createLookupPipeline(lookups);
    const facet: PipelineStage.Facet['$facet'] = {
      stage1: [{ $group: { _id: null, count: { $sum: 1 } } }],
      stage2: [{ $limit: this.limit + 1 }, ...lookupPipelines]
    };
    let navType: number = 1;
    let pageValue: string;
    if (this.pageToken) {
      [navType, pageValue] = parsePageToken(this.pageToken);
      const pagingQuery = getPageQuery(pageValue, navType, sortDirection, sortTarget);
      facet.stage2.unshift({ $match: { $expr: pagingQuery } });
    }
    const aggregation: PipelineStage[] = [];
    (this.search && this.fullTextSearch) && (this.filters.$text = { $search: this.search });
    !isEmptyObject(this.filters) && aggregation.push({ $match: this.filters });
    // Sort results depend on navigation type (next page, previous page)
    const targetSortDirection = navType === 1 ? sortDirection : <1 | -1>(sortDirection * -1);
    !isEmptyObject(this.sort) && aggregation.push({ $sort: { [sortTarget]: targetSortDirection } });
    !isEmptyObject(this.fields) && facet.stage2.push({ $project: this.fields });
    aggregation.push({ $facet: facet });
    // Query result depend on navigation type
    const resultQuery = navType === 1 ? { $slice: ['$stage2', this.limit] } : { $reverseArray: { $slice: ['$stage2', this.limit] } };
    aggregation.push(
      { $unwind: '$stage1' },
      {
        $project: {
          _id: 0,
          totalResults: '$stage1.count',
          results: resultQuery,
          hasNextPage: { $gt: [{ $size: '$stage2' }, this.limit] }
        }
      },
      {
        $addFields: {
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
  if (!tokenData) return null;
  const tokenJson = JSON.stringify(tokenData);
  return Buffer.from(tokenJson).toString('base64url');
}
