import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';

import { MediaQueueAdvancedDto } from './media-queue-advanced.dto';

export class EncodeMediaSourceDto {
  @ApiProperty({
    type: MediaQueueAdvancedDto,
    description: 'Advanced options to process media source',
    required: false
  })
  @Type(() => MediaQueueAdvancedDto)
  @IsOptional()
  @ValidateNested()
  options: MediaQueueAdvancedDto;
}
