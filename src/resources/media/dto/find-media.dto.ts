import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

import { StatusCode } from '../../../enums';

export class FindMediaDto {
  @ApiProperty({
    type: Boolean,
    description: 'Include hidden episodes (unlisted and private, need manage media permission)',
    required: false
  })
  @Transform(({ value }) => {
    return value != undefined ? [true, 'true'].indexOf(value) > -1 : undefined;
  })
  @IsOptional()
  @IsBoolean({ context: { code: StatusCode.IS_BOOLEAN } })
  includeHiddenEps: boolean;

  @ApiProperty({
    type: Boolean,
    description: 'Include unprocessed episodes, need manage media permission',
    required: false
  })
  @Transform(({ value }) => {
    return value != undefined ? [true, 'true'].indexOf(value) > -1 : undefined;
  })
  @IsOptional()
  @IsBoolean({ context: { code: StatusCode.IS_BOOLEAN } })
  includeUnprocessedEps: boolean;
}
