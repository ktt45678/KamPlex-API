import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsISO31661Alpha2, IsNotEmpty, MaxLength } from 'class-validator';

import { ProducerExist } from '../../../decorators/producer-exist.decorator';
import { StatusCode } from '../../../enums';

export class CreateProducerDto {
  @ApiProperty({
    type: String,
    description: 'Producer name',
    maxLength: 150,
    example: 'A New Movie Studio'
  })
  @Type(() => String)
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  @MaxLength(150, { context: { code: StatusCode.MAX_LENGTH } })
  @ProducerExist({ context: { code: StatusCode.PRODUCER_EXIST } })
  name: string;

  @ApiProperty({
    type: String,
    description: 'Country of the producer (ISO 3166 Alpha 2)',
    example: 'US'
  })
  @Type(() => String)
  @Transform(({ value }) => typeof value === 'string' ? value.toUpperCase() : value)
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  @IsISO31661Alpha2({ context: { code: StatusCode.IS_ISO_3166_ALPHA2 } })
  country: string;
}
