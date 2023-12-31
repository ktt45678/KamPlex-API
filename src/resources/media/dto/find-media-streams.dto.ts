import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional } from 'class-validator';

export class FindMediaStreamsDto {
  @ApiProperty({
    type: Boolean,
    description: 'Request for preview',
    required: false
  })
  @Transform(({ value }) => {
    return value != undefined ? [true, 'true'].indexOf(value) > -1 : value;
  }, { toClassOnly: true })
  @IsOptional()
  preview: boolean;
}
