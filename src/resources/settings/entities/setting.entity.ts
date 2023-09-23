import { ApiProperty } from '@nestjs/swagger';

import { Owner } from './owner.entity';
import { ExternalStorage } from '../../external-storages/entities/external-storage.entity';
import { Exclude } from 'class-transformer';

export class Setting {
  @ApiProperty()
  _id: bigint;

  @ApiProperty()
  owner: Owner;

  // @ApiProperty({
  //   type: ExternalStorage
  // })
  // mediaPosterStorage: ExternalStorage;

  // @ApiProperty({
  //   type: ExternalStorage
  // })
  // mediaBackdropStorage: ExternalStorage;

  @ApiProperty({
    type: [ExternalStorage]
  })
  mediaSourceStorages: ExternalStorage[];

  @ApiProperty({
    type: [ExternalStorage]
  })
  linkedMediaSourceStorages: ExternalStorage[];

  @Exclude()
  __v: number;
}
