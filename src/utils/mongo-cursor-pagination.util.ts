import { PipelineStage } from 'mongoose';
import { partition } from 'lodash';

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
  typeMap: Map<string, any>;

  constructor(partial: Partial<MongooseCursorPagination>) {
    Object.assign(this, partial);
  }

  build() {
    const sortValue = convertToMongooseSort(this.sortQuery, this.sortEnum);
    if (!isEmptyObject(sortValue)) this.sort = sortValue;
    const [sortTarget, sortDirection] = this.parseSort();
    const facet: PipelineStage.Facet['$facet'] = {
      stage1: [{ $group: { _id: null, count: { $sum: 1 } } }],
      stage2: [{ $limit: this.limit + 1 }]
    };
    let navType: number = 1;
    let pageValue: string;
    if (this.pageToken) {
      [navType, pageValue] = parsePageToken(this.pageToken);
      const pagingQuery = this.getPageQuery(pageValue, navType, sortDirection, sortTarget);
      facet.stage2.unshift({ $match: { $expr: pagingQuery } });
    }
    const aggregation: PipelineStage[] = [];
    (this.search && this.fullTextSearch) && (this.filters.$text = { $search: this.search });
    !isEmptyObject(this.filters) && aggregation.push({ $match: this.filters });
    // Sort results depend on navigation type (next page, previous page)
    //const targetSortDirection = navType === 1 ? sortDirection : <1 | -1>(sortDirection * -1);
    !isEmptyObject(this.sort) && aggregation.push({ $sort: this.sort });
    !isEmptyObject(this.fields) && facet.stage2.push({ $project: this.fields });
    aggregation.push({ $facet: facet });
    // Query result depend on navigation type
    //const resultQuery = navType === 1 ? { $slice: ['$stage2', this.limit] } : { $reverseArray: { $slice: ['$stage2', this.limit] } };
    aggregation.push(
      { $unwind: '$stage1' },
      {
        $project: {
          _id: 0,
          totalResults: '$stage1.count',
          results: { $slice: ['$stage2', this.limit] },
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

  buildLookup(options: LookupOptions[]) {
    const sortValue = convertToMongooseSort(this.sortQuery, this.sortEnum);
    if (!isEmptyObject(sortValue)) this.sort = sortValue;
    const [sortTarget, sortDirection] = this.parseSort();
    const [preProjOptions, postProjOptions] = partition(options, function (o) { return !o.postProjection; });
    const lookupPipelines = createLookupPipeline(preProjOptions);
    const postLookupPipelines = createLookupPipeline(postProjOptions);
    const facet: PipelineStage.Facet['$facet'] = {
      stage1: [{ $count: 'count' }],
      stage2: [{ $limit: this.limit + 1 }, ...lookupPipelines]
    };
    let navType: number = 1;
    let pageValue: string;
    if (this.pageToken) {
      [navType, pageValue] = parsePageToken(this.pageToken);
      const pagingQuery = this.getPageQuery(pageValue, navType, sortDirection, sortTarget);
      facet.stage2.unshift({ $match: { $expr: pagingQuery } });
    }
    const aggregation: PipelineStage[] = [];
    (this.search && this.fullTextSearch) && (this.filters.$text = { $search: this.search });
    !isEmptyObject(this.filters) && aggregation.push({ $match: this.filters });
    // Sort results depend on navigation type (next page, previous page)
    //const targetSortDirection = navType === 1 ? sortDirection : <1 | -1>(sortDirection * -1);
    !isEmptyObject(this.sort) && aggregation.push({ $sort: this.sort });
    !isEmptyObject(this.fields) && facet.stage2.push({ $project: this.fields });
    facet.stage2.push(...postLookupPipelines);
    aggregation.push({ $facet: facet });
    // Query result depend on navigation type
    //const resultQuery = navType === 1 ? { $slice: ['$stage2', this.limit] } : { $reverseArray: { $slice: ['$stage2', this.limit] } };
    aggregation.push(
      { $unwind: '$stage1' },
      {
        $project: {
          _id: 0,
          totalResults: '$stage1.count',
          results: { $slice: ['$stage2', this.limit] },
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

  buildLookupOnly(id: string | bigint, options: LookupOptions) {
    const sortValue = convertToMongooseSort(this.sortQuery, this.sortEnum);
    if (!isEmptyObject(sortValue)) this.sort = sortValue;
    const lookupPipeline = this.createLookupOnlyPipeline(options);
    const aggregation: PipelineStage[] = [
      { $match: { _id: id } },
      { $lookup: lookupPipeline },
      { $unwind: `$${options.as}` },
      { $replaceRoot: { newRoot: `$${options.as}` } }
    ];
    return aggregation;
  }

  private createLookupOnlyPipeline(options: LookupOptions) {
    const [sortTarget, sortDirection] = this.parseSort();
    let childrenLookupPipelines = [];
    let childrenPostLookupPipelines = [];
    if (options.children) {
      const [preProjOptions, postProjOptions] = partition(options.children, function (o) { return !o.postProjection; });
      childrenLookupPipelines = createLookupPipeline(preProjOptions);
      childrenPostLookupPipelines = createLookupPipeline(postProjOptions);
    }
    const facet: PipelineStage.Facet['$facet'] = {
      stage1: [{ $group: { _id: null, count: { $sum: 1 } } }],
      stage2: [{ $limit: this.limit + 1 }, ...childrenLookupPipelines]
    };
    let navType: number = 1;
    let pageValue: string;
    if (this.pageToken) {
      [navType, pageValue] = parsePageToken(this.pageToken);
      const pagingQuery = this.getPageQuery(pageValue, navType, sortDirection, sortTarget);
      facet.stage2.unshift({ $match: { $expr: pagingQuery } });
    }
    if (!isEmptyObject(this.fields)) facet.stage2.push({ $project: this.fields });
    facet.stage2.push(...childrenPostLookupPipelines);
    const lookup: PipelineStage.Lookup['$lookup'] = {
      from: options.from,
      localField: options.localField,
      foreignField: options.foreignField,
      as: options.as,
      pipeline: [{ $facet: facet }]
    };
    //const resultQuery = navType === 1 ? { $slice: ['$stage2', this.limit] } : { $reverseArray: { $slice: ['$stage2', this.limit] } };
    lookup.pipeline.push(
      { $unwind: '$stage1' },
      {
        $project: {
          _id: 0,
          totalResults: '$stage1.count',
          results: { $slice: ['$stage2', this.limit] },
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
    !isEmptyObject(this.sort) && lookup.pipeline.unshift({ $sort: this.sort });
    options.pipeline?.length && lookup.pipeline.unshift(...options.pipeline);
    return lookup;
  }

  buildLookupOnlyObject(options: LookupOptions[], objectOptions: LookupOnlyObjectOptions) {
    const { parent, secondListName } = objectOptions;
    const sortValue = convertToMongooseSort(this.sortQuery, this.sortEnum);
    if (!isEmptyObject(sortValue)) this.sort = sortValue;
    const [sortTarget, sortDirection] = this.parseSort();
    const facet: PipelineStage.Facet['$facet'] = {
      stage1: [{ $group: { _id: null, count: { $sum: 1 } } }],
      stage2: [{ $limit: this.limit + 1 }]
    };
    let navType: number = 1;
    let pageValue: string;
    if (this.pageToken) {
      [navType, pageValue] = parsePageToken(this.pageToken);
      const pagingQuery = this.getPageQuery(pageValue, navType, sortDirection, sortTarget);
      facet.stage2.unshift({ $match: { $expr: pagingQuery } });
    }
    const aggregation: PipelineStage[] = [];
    !isEmptyObject(this.filters) && aggregation.push({ $match: this.filters });
    // Sort array of objects
    // Sort results depend on navigation type (next page, previous page)
    const targetSortDirection = navType === 1 ? sortDirection : <1 | -1>(sortDirection * -1);
    aggregation.push(
      { $unwind: { path: `$${parent}`, preserveNullAndEmptyArrays: true } },
      { $replaceRoot: { newRoot: { $ifNull: [`$${parent}`, { '#placeholder#': 1 }] } } },
      { $match: { '#placeholder#': { $ne: 1 } } }
    );
    (sortTarget && targetSortDirection) && aggregation.push({ $sort: this.sort });
    aggregation.push({ $facet: facet });
    // Query result depend on navigation type
    //const resultQuery = navType === 1 ? { $slice: ['$stage2', this.limit] } : { $reverseArray: { $slice: ['$stage2', this.limit] } };
    const [preProjOptions, postProjOptions] = partition(options, function (o) { return !o.postProjection; });
    const lookupPipelines = createLookupPipeline(preProjOptions);
    const postLookupPipelines = createLookupPipeline(postProjOptions);
    const facet2: PipelineStage.Facet['$facet'] = {
      stage1: [{
        $project: {
          count: '$stage1.count',
          results: { $slice: ['$stage2', this.limit] },
          hasNextPage: { $gt: [{ $size: '$stage2' }, this.limit] }
        }
      }],
      stage2: [{ $project: { [parent]: { $slice: ['$stage2', this.limit] } } }, ...lookupPipelines]
    };
    !isEmptyObject(this.fields) && facet2.stage2.push({ $project: this.fields });
    facet2.stage2.push(...postLookupPipelines);
    aggregation.push(
      { $unwind: { path: '$stage1', preserveNullAndEmptyArrays: true } },
      { $facet: facet2 },
      { $unwind: { path: '$stage1', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$stage2', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          totalResults: '$stage1.count',
          results: '$stage1.results',
          [secondListName]: `$stage2.${secondListName}`,
          hasNextPage: '$stage1.hasNextPage',
          nextPageToken: [1, { $last: '$stage1.results.' + sortTarget }],
          prevPageToken: [-1, { $first: '$stage1.results.' + sortTarget }]
        }
      }
    );
    return aggregation;
  }

  private getPageQuery(value: string | number, navType: number, sortDirection: number, sortTarget: string) {
    const castValue = this.tryCastToSchemaType(sortTarget, value);
    const convertQuery = [`$${sortTarget}`, castValue];
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

  private tryCastToSchemaType(field: string, value: any) {
    if (!this.typeMap)
      return value;
    const ctr = this.typeMap.get(field);
    if ([String, Number, Boolean].includes(ctr))
      return ctr(value);
    return new ctr(value);
  }

  private parseSort(): [string, 1 | -1] {
    let sortTarget = this.sortEnum?.[0];
    let sortDirection: 1 | -1 = 1;
    if (!isEmptyObject(this.sort)) {
      let firstSortKey = Object.keys(this.sort)[0];
      sortTarget = firstSortKey;
      sortDirection = this.sort[firstSortKey];
    }
    return [sortTarget, sortDirection];
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
  const convertQuery = [`$${sortTarget}`, value];
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
    return [null, null];
  }
  if (!Array.isArray(tokenData) || tokenData.length !== 2) return [null, null];
  const [navType] = tokenData;
  if (![-1, 1].includes(navType)) return [null, null];
  return tokenData;
}

export function tokenDataToPageToken(tokenData: [number, string]) {
  if (!tokenData) return null;
  const tokenJson = JSON.stringify(tokenData);
  return Buffer.from(tokenJson).toString('base64url');
}

export interface LookupOnlyObjectOptions {
  parent: string;
  secondListName: string;
}
