import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsNotEmpty } from 'class-validator';

import { StatusCode } from '../../../enums';

export class FindWatchTimeDto {
  @ApiProperty({
    type: String,
    description: 'Media id'
  })
  @Transform(({ value }) => BigInt(value))
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  media: bigint;

  @ApiProperty({
    type: String,
    description: 'Episode id'
  })
  @Transform(({ value }) => BigInt(value))
  @IsOptional()
  episode: bigint;
}
