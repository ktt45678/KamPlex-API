import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Type } from 'class-transformer';

import { ICursorPaginated } from '../interfaces';

export class CursorPaginated<T> {
  @ApiProperty()
  nextPageToken: string = null;

  @ApiProperty()
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
