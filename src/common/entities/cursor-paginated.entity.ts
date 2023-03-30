import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Transform, Type } from 'class-transformer';

import { ICursorPaginated } from '../interfaces';
import { tokenDataToPageToken } from '../../utils';

export class CursorPaginated<T> {
  @ApiProperty()
  totalResults: number = 0;

  @ApiProperty()
  hasNextPage: boolean = false;

  @ApiProperty()
  @Transform(({ value }) => {
    return tokenDataToPageToken(value);
  }, { toPlainOnly: true })
  nextPageToken: string = null;

  @ApiProperty()
  @Transform(({ value }) => {
    return tokenDataToPageToken(value);
  }, { toPlainOnly: true })
  prevPageToken: string = null;

  @ApiProperty()
  @Type(options => (options.newObject as CursorPaginated<T>).type)
  results: T[] = [];

  @Exclude()
  private type: Function;

  constructor(options?: ICursorPaginated<CursorPaginated<T>>) {
    if (!options)
      return;
    else if (options.type)
      this.type = options.type;
    else if (options.partial)
      Object.assign(this, options.partial);
  }
}
