import { ApiProperty } from '@nestjs/swagger';

import { Owner } from './owner.entity';
import { ExternalStorage } from '../../external-storages/entities/external-storage.entity';
import { Exclude } from 'class-transformer';

export class Setting {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  owner: Owner;

  @ApiProperty({
    type: String
  })
  mediaPosterStorage: ExternalStorage;

  @ApiProperty({
    type: String
  })
  mediaBackdropStorage: ExternalStorage;

  @ApiProperty({
    type: [String]
  })
  mediaSourceStorages: ExternalStorage[];

  @Exclude()
  __v: number;
}