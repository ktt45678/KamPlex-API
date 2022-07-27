import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsISO31661Alpha2, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

import { StatusCode } from '../../../enums';

export class CreateProductionDto {
  @ApiProperty({
    type: String,
    description: 'Production name',
    maxLength: 150,
    example: 'A New Movie Studio'
  })
  @Type(() => String)
  @IsNotEmpty({ context: { code: StatusCode.IS_NOT_EMPTY } })
  @MaxLength(150, { context: { code: StatusCode.MAX_LENGTH } })
  name: string;

  @ApiProperty({
    type: String,
    description: 'Country of the production (ISO 3166 Alpha 2)',
    example: 'US'
  })
  @Type(() => String)
  @Transform(({ value }) => typeof value === 'string' ? value.toUpperCase() : value)
  @IsOptional()
  @IsISO31661Alpha2({ context: { code: StatusCode.IS_ISO_3166_ALPHA2 } })
  country: string;
}
