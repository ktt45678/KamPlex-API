import { ApiProperty } from '@nestjs/swagger';

export class Paginated<T> {
  @ApiProperty()
  totalPages: number = 0;

  @ApiProperty()
  totalResults: number = 0;

  @ApiProperty()
  page: number = 0;

  @ApiProperty()
  results: T[] = [];

  constructor(partial: Partial<Paginated<T>>) {
    Object.assign(this, partial);
  }
}