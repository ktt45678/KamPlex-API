import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

import { MediaProviderDto } from './media-provider.dto';
import { MediaLanguageDto } from './media-language.dto';

export class MediaDetailsDto extends IntersectionType(MediaProviderDto, MediaLanguageDto) {
  @ApiProperty({
    type: String,
    description: 'Type of media',
    enum: ['movie', 'tv']
  })
  @IsIn(['movie', 'tv'])
  type: 'movie' | 'tv';
}
