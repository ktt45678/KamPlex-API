import { PipelineStage } from 'mongoose';

import { calculatePageSkip, convertToMongooseSort } from './mongoose-helper.util';
import { isEmptyObject } from './object-helper.util';

export class MongooseOffsetPagination {
  page?: number = 1;
  limit?: number = 30;
  search?: string;
  filters?: { [key: string]: any } = {};
  sortQuery?: string;
  sortEnum?: string[];
  fullTextSearch?: boolean = false;
  fields?: { [key: string]: any };
  sort?: { [key: string]: any };
  private skip?: number;

  constructor(partial: Partial<MongooseOffsetPagination>) {
    Object.assign(this, partial);
    this.skip = calculatePageSkip(this.page, this.limit);
  }

  build() {
    const sortValue = convertToMongooseSort(this.sortQuery, this.sortEnum);
    if (!isEmptyObject(sortValue)) this.sort = sortValue;
    const facet: PipelineStage.Facet['$facet'] = {
      stage1: [{ $group: { _id: null, count: { $sum: 1 } } }],
      stage2: [{ $skip: this.skip }, { $limit: this.limit }]
    };
    !isEmptyObject(this.fields) && facet.stage2.push({ $project: this.fields });
    (this.search && this.fullTextSearch) && (this.filters.$text = { $search: this.search });
    const aggregation: PipelineStage[] = [
      { $facet: facet },
      { $unwind: '$stage1' },
      { $project: { totalPages: { $ceil: { $divide: ['$stage1.count', this.limit] } }, totalResults: '$stage1.count', results: '$stage2' } },
      { $addFields: { page: this.page } }
    ];
    !isEmptyObject(this.sort) && aggregation.unshift({ $sort: this.sort });
    !isEmptyObject(this.filters) && aggregation.unshift({ $match: this.filters });
    return aggregation;
  }

  buildLookup(options: LookupOptions[]) {
    const sortValue = convertToMongooseSort(this.sortQuery, this.sortEnum);
    if (!isEmptyObject(sortValue)) this.sort = sortValue;
    const lookupPipelines = createLookupPipeline(options);
    const facet: { [key: string]: any } = {
      stage1: [{ $group: { _id: null, count: { $sum: 1 } } }],
      stage2: [{ $skip: this.skip }, { $limit: this.limit }, ...lookupPipelines]
    };
    if (!isEmptyObject(this.fields)) facet.stage2.push({ $project: this.fields });
    if (this.search && this.fullTextSearch) this.filters.$text = { $search: this.search };
    const aggregation: PipelineStage[] = [
      { $facet: facet },
      { $unwind: '$stage1' },
      { $project: { totalPages: { $ceil: { $divide: ['$stage1.count', this.limit] } }, totalResults: '$stage1.count', results: '$stage2' } },
      { $addFields: { page: this.page } }
    ];
    !isEmptyObject(this.sort) && aggregation.unshift({ $sort: this.sort });
    !isEmptyObject(this.filters) && aggregation.unshift({ $match: this.filters });
    return aggregation;
  }

  buildLookupOnly(id: string, options: LookupOptions) {
    const sortValue = convertToMongooseSort(this.sortQuery, this.sortEnum, options.as);
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
    const facet: PipelineStage.Facet['$facet'] = {
      stage1: [{ $group: { _id: null, count: { $sum: 1 } } }],
      stage2: [{ $skip: this.skip }, { $limit: this.limit }]
    };
    if (!isEmptyObject(this.fields)) facet.stage2.push({ $project: this.fields });
    const lookup: PipelineStage.Lookup['$lookup'] = {
      from: options.from,
      localField: options.localField,
      foreignField: options.foreignField,
      as: options.as,
      pipeline: [
        { $facet: facet },
        { $unwind: '$stage1' },
        { $project: { totalPages: { $ceil: { $divide: ['$stage1.count', this.limit] } }, totalResults: '$stage1.count', results: '$stage2' } },
        { $addFields: { page: this.page } }
      ]
    };
    !isEmptyObject(this.sort) && lookup.pipeline.unshift({ $sort: this.sort });
    options.pipeline?.length && lookup.pipeline.unshift(...options.pipeline);
    return lookup;
  }

  toObject() {
    const sortValue = convertToMongooseSort(this.sortQuery, this.sortEnum);
    if (!isEmptyObject(sortValue)) this.sort = sortValue;
    return {
      skip: this.skip,
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

export interface LookupOptions {
  from: string;
  localField: string;
  foreignField: string;
  as: string;
  let?: PipelineStage.Lookup['$lookup']['let'];
  pipeline?: PipelineStage.Lookup['$lookup']['pipeline'];
  isArray?: boolean;
  postProjection?: boolean;
  children?: LookupOptions[];
}

export function createLookupPipeline(options: LookupOptions[]) {
  const lookups = [];
  for (let i = 0; i < options.length; i++) {
    const option = options[i];
    const as = `$${option.as}`;
    const lookup: PipelineStage.Lookup['$lookup'] = {
      from: option.from,
      localField: option.localField,
      foreignField: option.foreignField,
      as: option.as
    };
    if (!isEmptyObject(option.let)) lookup.let = option.let;
    if (option.pipeline?.length) lookup.pipeline = option.pipeline;
    if (Array.isArray(option.children)) {
      const childrenLookups = createLookupPipeline(option.children);
      lookup.pipeline.push(...childrenLookups);
    }
    lookups.push({ $lookup: lookup });
    if (!option.isArray) lookups.push({ $unwind: { path: as, preserveNullAndEmptyArrays: true } });
  }
  return lookups;
}
