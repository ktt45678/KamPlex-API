import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

import { StatusCode } from '../../../enums';

export class FindTVEpisodesDto {
  @ApiProperty({
    type: Boolean,
    description: 'Limit number of episodes',
    required: false
  })
  @Transform(({ value }) => {
    return value != undefined ? [true, 'true'].indexOf(value) > -1 : undefined;
  })
  @IsOptional()
  @IsBoolean({ context: { code: StatusCode.IS_BOOLEAN } })
  limited: boolean;

  @ApiProperty({
    type: Boolean,
    description: 'Include hidden shows (unlisted and private, need manage media permission)',
    required: false
  })
  @Transform(({ value }) => {
    return value != undefined ? [true, 'true'].indexOf(value) > -1 : undefined;
  })
  @IsOptional()
  @IsBoolean({ context: { code: StatusCode.IS_BOOLEAN } })
  includeHidden: boolean;

  @ApiProperty({
    type: Boolean,
    description: 'Include unprocessed shows, need manage media permission',
    required: false
  })
  @Transform(({ value }) => {
    return value != undefined ? [true, 'true'].indexOf(value) > -1 : undefined;
  })
  @IsOptional()
  @IsBoolean({ context: { code: StatusCode.IS_BOOLEAN } })
  includeUnprocessed: boolean;
}
