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
}
