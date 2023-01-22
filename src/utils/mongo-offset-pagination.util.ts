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

  buildLookup(lookups: LookupOptions[]) {
    const sortValue = convertToMongooseSort(this.sortQuery, this.sortEnum);
    if (!isEmptyObject(sortValue)) this.sort = sortValue;
    const lookupPipelines = createLookupPipeline(lookups);
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

  buildLookupOnly(id: string, lookup: LookupOptions) {
    const sortValue = convertToMongooseSort(this.sortQuery, this.sortEnum, lookup.as);
    if (!isEmptyObject(sortValue)) this.sort = sortValue;
    const lookupPipeline = this.createLookupOnlyPipeline(lookup);
    const aggregation: PipelineStage[] = [
      { $match: { _id: id } },
      { $lookup: lookupPipeline },
      { $unwind: `$${lookup.as}` },
      { $replaceRoot: { newRoot: `$${lookup.as}` } }
    ];
    return aggregation;
  }

  private createLookupOnlyPipeline(lookup: LookupOptions) {
    const match: any = { $expr: { $in: [`$${lookup.foreignField}`, `$$${lookup.localField}`] } };
    if (this.search && this.fullTextSearch) this.filters.$text = { $search: this.search };
    if (this.filters) Object.assign(match, this.filters);
    const facet: { [key: string]: any } = {
      stage1: [{ $group: { _id: null, count: { $sum: 1 } } }],
      stage2: [{ $skip: this.skip }, { $limit: this.limit }]
    };
    if (!isEmptyObject(this.fields)) facet.stage2.push({ $project: this.fields });
    const pipeline: any = {
      from: lookup.from,
      as: lookup.as,
      let: { [lookup.localField]: `$${lookup.localField}` },
      pipeline: [
        { $facet: facet },
        { $unwind: '$stage1' },
        { $project: { totalPages: { $ceil: { $divide: ['$stage1.count', this.limit] } }, totalResults: '$stage1.count', results: '$stage2' } },
        { $addFields: { page: this.page } }
      ]
    };
    !isEmptyObject(this.sort) && pipeline.pipeline.unshift({ $sort: this.sort });
    pipeline.pipeline.unshift({ $match: match });
    return pipeline;
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

export class LookupOptions {
  from: string;
  localField: string;
  foreignField: string;
  as: string;
  project?: any;
  isArray?: boolean;
  sort?: any;
  children?: LookupOptions[];
}

export function createLookupPipeline(lookups: LookupOptions[]) {
  const pipelines = [];
  for (let i = 0; i < lookups.length; i++) {
    const lookup = lookups[i];
    const localField = `$$${lookup.localField}`;
    const foreignField = `$${lookup.foreignField}`;
    const as = `$${lookup.as}`;
    const match: any = lookup.isArray ?
      { $expr: { $in: [foreignField, localField] } } :
      { $expr: { $eq: [foreignField, localField] } };
    const pipeline: any = {
      from: lookup.from,
      as: lookup.as,
      let: { [lookup.localField]: `$${lookup.localField}` },
      pipeline: [{ $match: match }]
    };
    if (!isEmptyObject(lookup.project)) pipeline.pipeline.push({ $project: lookup.project });
    if (!isEmptyObject(lookup.sort)) pipeline.pipeline.push({ $sort: lookup.sort });
    if (Array.isArray(lookup.children)) {
      const childrenPipelines = createLookupPipeline(lookup.children);
      pipeline.pipeline.push(...childrenPipelines);
    }
    pipelines.push({ $lookup: pipeline });
    if (!lookup.isArray) pipelines.push({ $unwind: { path: as, preserveNullAndEmptyArrays: true } });
  }
  return pipelines;
}
