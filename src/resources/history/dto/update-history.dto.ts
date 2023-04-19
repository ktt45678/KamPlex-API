import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';

export class UpdateHistoryDto {
  @ApiProperty({
    type: Boolean,
    description: 'Pause this history record to prevent watch time update',
    required: false
  })
  @Transform(({ value }) => {
    return value != undefined ? [true, 'true'].indexOf(value) > -1 : value;
  }, { toClassOnly: true })
  @IsOptional()
  paused: boolean;

  @ApiProperty({
    type: Number,
    description: 'Mark this movie/episode as watched or not, will increase watchtime',
    required: false
  })
  @IsOptional()
  @IsIn([0, 1])
  watched: number;

  @ApiProperty({
    type: Boolean,
    description: 'Request to watch the movie/episode again',
    required: false
  })
  @Transform(({ value }) => {
    return value != undefined ? [true, 'true'].indexOf(value) > -1 : value;
  }, { toClassOnly: true })
  @IsOptional()
  rewatch: boolean;
}
