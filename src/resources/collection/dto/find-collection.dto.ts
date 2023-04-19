import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional } from 'class-validator';

export class FindCollectionDto {
  @ApiProperty({
    type: Boolean,
    description: 'Include hidden media (unlisted and private, need manage media permission)',
    required: false
  })
  @Transform(({ value }) => {
    return value != undefined ? [true, 'true'].indexOf(value) > -1 : value;
  }, { toClassOnly: true })
  @IsOptional()
  includeHiddenMedia: boolean;

  @ApiProperty({
    type: Boolean,
    description: 'Include unprocessed media, need manage media permission',
    required: false
  })
  @Transform(({ value }) => {
    return value != undefined ? [true, 'true'].indexOf(value) > -1 : value;
  }, { toClassOnly: true })
  @IsOptional()
  includeUnprocessedMedia: boolean;
}
