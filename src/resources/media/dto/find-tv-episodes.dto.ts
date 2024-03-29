import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional } from 'class-validator';

export class FindTVEpisodesDto {
  @ApiProperty({
    type: Boolean,
    description: 'Include hidden shows (unlisted and private, need manage media permission)',
    required: false
  })
  @Transform(({ value }) => {
    return value != undefined ? [true, 'true'].indexOf(value) > -1 : value;
  }, { toClassOnly: true })
  @IsOptional()
  includeHidden: boolean;

  @ApiProperty({
    type: Boolean,
    description: 'Include unprocessed shows, need manage media permission',
    required: false
  })
  @Transform(({ value }) => {
    return value != undefined ? [true, 'true'].indexOf(value) > -1 : value;
  }, { toClassOnly: true })
  @IsOptional()
  includeUnprocessed: boolean;
}
