import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsNotEmpty } from 'class-validator';

import { StatusCode } from '../../../enums';

export class FindWatchTimeDto {
  @ApiProperty({
    type: String,
    description: 'Media id'
  })
  @Type(() => String)
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  media: string;

  @ApiProperty({
    type: String,
    description: 'Episode id'
  })
  @Type(() => String)
  @IsOptional()
  episode: string;
}
