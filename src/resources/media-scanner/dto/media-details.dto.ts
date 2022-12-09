import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

import { MediaLanguageDto } from './media-language.dto';

export class MediaDetailsDto extends MediaLanguageDto {
  @ApiProperty({
    type: String,
    description: 'Type of media',
    enum: ['movie', 'tv']
  })
  @IsIn(['movie', 'tv'])
  type: string;
}
