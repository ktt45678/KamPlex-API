import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional } from 'class-validator';

import { AddMediaSourceDto } from './add-media-source.dto';

export class AddLinkedMediaSourceDto extends AddMediaSourceDto {
  @ApiProperty({
    type: String,
    description: 'Link a source from another storage',
    example: 'Movies/Media'
  })
  @Type(() => String)
  @IsOptional()
  linkedPath: string;
}
