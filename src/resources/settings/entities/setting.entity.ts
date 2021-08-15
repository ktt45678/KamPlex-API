import { ApiProperty } from '@nestjs/swagger';

import { Owner } from './owner.entity';

export class Setting {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  owner: Owner;

  @ApiProperty()
  __v: number;

  constructor(partial: Partial<Setting>) {
    Object.assign(this, partial);
  }
}