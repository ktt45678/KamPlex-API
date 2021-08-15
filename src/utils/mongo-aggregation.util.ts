import { isEmpty } from 'lodash';

import { calculatePageSkip, convertToMongooseSort } from './misc.util';

export class MongooseAggregation {
  page?: number = 1;
  limit?: number = 30;
  search?: string;
  filters?: any = {};
  sortQuery?: string;
  sortEnum?: string[];
  fullTextSearch?: boolean = false;
  fields?: any;
  private sort?: any = { _id: -1 };
  private skip?: number;

  constructor(partial: Partial<MongooseAggregation>) {
    Object.assign(this, partial);
    this.skip = calculatePageSkip(this.page, this.limit);
  }

  build() {
    const sortValue = convertToMongooseSort(this.sortQuery, this.sortEnum);
    if (!isEmpty(sortValue)) this.sort = sortValue;
    const facet: any = {
      stage1: [{ $group: { _id: null, count: { $sum: 1 } } }],
      stage2: [{ $skip: this.skip }, { $limit: this.limit }]
    };
    if (!isEmpty(this.fields)) facet.stage2.push({ $project: this.fields });
    if (this.search && this.fullTextSearch) this.filters.$text = { $search: this.search };
    const aggregation: any[] = [
      { $sort: this.sort },
      { $facet: facet },
      { $unwind: '$stage1' },
      { $project: { totalPages: { $ceil: { $divide: ['$stage1.count', this.limit] } }, totalResults: '$stage1.count', results: '$stage2' } },
      { $addFields: { page: this.page } }
    ];
    if (!isEmpty(this.filters)) aggregation.unshift({ $match: this.filters });
    return aggregation;
  }

  buildLookup(id: string, lookup: LookupOptions) {
    const sortValue = convertToMongooseSort(this.sortQuery, this.sortEnum, lookup.as);
    if (!isEmpty(sortValue)) this.sort = sortValue;
    const lookupPipeline = this.createLookupPipeline(lookup);
    const aggregation: any[] = [
      { $match: { _id: id } },
      { $lookup: lookupPipeline },
      { $unwind: `$${lookup.as}` },
      { $replaceRoot: { newRoot: `$${lookup.as}` } }
    ];
    return aggregation;
  }

  private createLookupPipeline(lookup: LookupOptions) {
    const match: any = { $expr: { $in: [`$${lookup.foreignField}`, `$$${lookup.localField}`] } };;
    if (this.search && this.fullTextSearch) this.filters.$text = { $search: this.search };
    if (this.filters) Object.assign(match, this.filters);
    const facet: any = {
      stage1: [{ $group: { _id: null, count: { $sum: 1 } } }],
      stage2: [{ $skip: this.skip }, { $limit: this.limit }]
    };
    if (!isEmpty(this.fields)) facet.stage2.push({ $project: this.fields });
    const pipeline: any = {
      from: lookup.from,
      as: lookup.as,
      let: { [lookup.localField]: `$${lookup.localField}` },
      pipeline: [
        { $match: match },
        { $sort: this.sort },
        { $facet: facet },
        { $unwind: '$stage1' },
        { $project: { totalPages: { $ceil: { $divide: ['$stage1.count', this.limit] } }, totalResults: '$stage1.count', results: '$stage2' } },
        { $addFields: { page: this.page } }
      ]
    };
    return pipeline;
  }

  toObject() {
    const sortValue = convertToMongooseSort(this.sortQuery, this.sortEnum);
    if (!isEmpty(sortValue)) this.sort = sortValue;
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
}