import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional } from 'class-validator';

import { StatusCode } from '../../../enums';

export class MediaScannerData {
  @ApiProperty({
    type: Boolean,
    description: 'Enable media scanner',
    example: false
  })
  @Transform(({ value }) => {
    return value != undefined ? [true, 'true'].indexOf(value) > -1 : value;
  })
  @IsBoolean({ context: { code: StatusCode.IS_BOOLEAN } })
  enabled: boolean;

  @ApiProperty({
    type: Number,
    description: 'TV Show\'s season number'
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ context: { code: StatusCode.IS_INT } })
  tvSeason: number;
}
