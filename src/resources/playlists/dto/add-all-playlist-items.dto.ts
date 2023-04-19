import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional } from 'class-validator';

import { StatusCode } from '../../../enums';
import { transformBigInt } from '../../../utils';

export class AddAllPlaylistItemsDto {
  @ApiProperty({
    type: String,
    description: 'Playlist id'
  })
  @Transform(({ value }) => transformBigInt(value), { toClassOnly: true })
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  playlistId: bigint;

  @ApiProperty({
    type: Boolean,
    description: 'Skip already added shows',
    required: false
  })
  @Transform(({ value }) => {
    return value != undefined ? [true, 'true'].indexOf(value) > -1 : value;
  }, { toClassOnly: true })
  @IsOptional()
  skipAlreadyAdded: boolean;
}
