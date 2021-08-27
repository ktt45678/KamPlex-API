import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Type } from 'class-transformer';

import { IPaginated } from '../interfaces/paginated.interface';

export class Paginated<T> {
  @ApiProperty()
  totalPages: number = 0;

  @ApiProperty()
  totalResults: number = 0;

  @ApiProperty()
  page: number = 0;

  @ApiProperty()
  @Type(options => (options.newObject as Paginated<T>).type)
  results: T[] = [];

  @Exclude()
  private type: Function;

  constructor(options?: IPaginated<Paginated<T>>) {
    if (!options)
      return;
    else if (options.type)
      this.type = options.type;
    else if (options.partial)
      Object.assign(this, options.partial);
  }
}
