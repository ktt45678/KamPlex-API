import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional } from 'class-validator';

export class FindMediaDto {
  @ApiProperty({
    type: Boolean,
    description: 'Include hidden episodes (unlisted and private, need manage media permission)',
    required: false
  })
  @Transform(({ value }) => {
    return value != undefined ? [true, 'true'].indexOf(value) > -1 : value;
  }, { toClassOnly: true })
  @IsOptional()
  includeHiddenEps: boolean;

  @ApiProperty({
    type: Boolean,
    description: 'Include unprocessed episodes, need manage media permission',
    required: false
  })
  @Transform(({ value }) => {
    return value != undefined ? [true, 'true'].indexOf(value) > -1 : value;
  }, { toClassOnly: true })
  @IsOptional()
  includeUnprocessedEps: boolean;
}
